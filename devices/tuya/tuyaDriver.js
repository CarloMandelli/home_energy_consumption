const TuyAPI = require("tuyapi");
const InfluxDao = require('../../db/influx/influxDao.js')
const PARAMS_MAP = {
  ON_OFF: '1',
  CONSUMPTION: '19'
};

const EVENT_TYPE = {
  ERROR: 0,
  INFO: 1
}

const REQUESTED_STATUS = {
  CONNECTED: 0,
  DISCONNECTED: 1
}

const EVENT_MAP = {
  CONNECTED: {
    str: 'Connected',
    type: EVENT_TYPE.INFO
  },
  DISCONNECTED: {
    str: 'Disconnected',
    type: EVENT_TYPE.INFO
  },
  ERROR: {
    str: 'Error',
    type: EVENT_TYPE.ERROR
  },
  ERROR_ON_FIND: {
    str: 'Error on find',
    type: EVENT_TYPE.ERROR
  },
  ERROR_ON_RETRY_CONNECTION: {
    str: 'Error on retry connection',
    type: EVENT_TYPE.ERROR
  },
  ERROR_ON_CONNECTION: {
    str: 'Error on connection',
    type: EVENT_TYPE.ERROR
  },
  RECEIVING_DATA:{
    str: 'Receiving data',
    type: EVENT_TYPE.INFO
  },
  REQUEST_START_POLLING:{
    str: 'Request start polling',
    type: EVENT_TYPE.INFO
  },
  REQUEST_REFRESH: {
    str: 'Refresh',
    type: EVENT_TYPE.INFO
  },
  ERROR_ON_REFRESH: {
    str: 'Error on refresh',
    type: EVENT_TYPE.ERROR
  }
}

class TuyAPIDriver {
  /**
   * response from device dps:
   *    { '1': true, status on/ off
   *      '9': 0,
   *      '18': 8739, energy
   *      '19': 19067,  power
   *      '20': 2175,   power supply voltage
   *      '21': 1,
   *      '22': 618,
   *      '23': 31593,
   *      '24': 17964,
   *      '25': 1160 } }
   */
  constructor(deviceObject, logger) {
    this.device = new TuyAPI({
      id: deviceObject.id,
      key: deviceObject.key
    });
    this.logger = logger

    this.deviceName = deviceObject.name;
    this.deviceValues = {on: false, consumption: 0, firstZero:false};
    this.pollingTimer = null;
    this.pollingRun = false;
    this.requestedStatus = REQUESTED_STATUS.DISCONNECTED
    this.firstResponseAfterConnection = false;
    this.retryConnectionCount = 0
    this.dbConnection = new InfluxDao(this.deviceName, this.logger);
    this.device.on('connected', () => {
      this.logger.debug(`Connected to device ${this.deviceName}!`);
      this.writeEventIntoDb(EVENT_MAP.CONNECTED)
      this.firstResponseAfterConnection = true;
    });

    this.device.on('disconnected', () => {
      this.logger.debug(`Disconnected from device ${this.deviceName}!`);
      this.writeEventIntoDb(EVENT_MAP.DISCONNECTED)
      if(this.requestedStatus === REQUESTED_STATUS.CONNECTED){
        this.retryToConnect()
      }
    });

    this.device.on('error', error => {
      this.stopPolling();
      if (this.device.isConnected()) {
        this.logger.error(`Error on device ${this.deviceName}! %o`, error);
        this.writeEventIntoDb(EVENT_MAP.ERROR)
      }
    });

    this.device.on('data', data => {
      if (this.device.isConnected()) {
        this.logger.debug(`Receiving data on device ${this.deviceName}!`);
        this.writeEventIntoDb(EVENT_MAP.RECEIVING_DATA)
        this._elaborateDataFromDevice(data);
      }
    });
    this.logger.info(`Init device ${this.deviceName}!`);
    this.logger.debug(`${this.deviceName}! id ${deviceObject.id} - key ${deviceObject.key}`);
  }

  async _setup(resolve, reject) {
    try {
      await this.device.find()
      resolve();
    } catch (e) {
      this.logger.error(`Error on find for device ${this.deviceName}! %o`, e);
      this.writeEventIntoDb(EVENT_MAP.ERROR_ON_FIND)
      reject();
    }
  }

  async retryToConnect() {
    this.retryConnectionCount++;
    try {
      await this.connect();
      this.retryConnectionCount = 0
      this.startPolling()
    } catch (e) {
      this.stopPolling()
      this.logger.error(`Error on retry connection (count ${this.retryConnectionCount}) device ${this.deviceName}! %o`, e);
      this.writeEventIntoDb(`${EVENT_MAP.ERROR_ON_RETRY_CONNECTION} (count ${this.retryConnectionCount})`)
      setTimeout(this.retryToConnect.bind(this), 30000);
    }
  }

  async _connect(resolve, reject) {
    try {
      await this.device.connect();
      resolve();
    } catch (e) {
      this.logger.error(`Error on connection for device ${this.deviceName}! %o`, e);
      this.writeEventIntoDb(EVENT_MAP.ERROR_ON_CONNECTION)
      reject();
    }
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.requestedStatus = REQUESTED_STATUS.CONNECTED
      this._connect(resolve, reject)
    });
  }

  setup() {
    return new Promise((resolve, reject) => this._setup(resolve, reject));
  }

  disconnect() {
    this.requestedStatus = REQUESTED_STATUS.DISCONNECTED
    clearTimeout(this.pollingTimer);
    this.device.disconnect();
  }

  startPolling() {
    this.logger.info(`Request start polling on device ${this.deviceName}!`);
    this.writeEventIntoDb(EVENT_MAP.REQUEST_START_POLLING)
    clearTimeout(this.pollingTimer);
    this.pollingRun = true;
    this._startSlowPolling();
  }

  stopPolling() {
    clearTimeout(this.pollingTimer);
    this.pollingRun = false;
  }

  _startSlowPolling() {
    this.pollingTimer = setTimeout(this._refresh.bind(this), 30000);
  }

  _startFastPolling() {
    this.pollingTimer = setTimeout(this._refresh.bind(this), 5000);
  }

  async _refresh() {
    this.logger.debug(`Refresh on device ${this.deviceName}!`);
    this.writeEventIntoDb(EVENT_MAP.REQUEST_REFRESH)
    try {
      this.device.refresh();
      await this.device.get();
    } catch (e) {
      this.logger.error(`Error on refresh ${this.deviceName}! %o`, e);
      this.writeEventIntoDb(EVENT_MAP.ERROR_ON_REFRESH)
      this.stopPolling();
    }
  }

  _elaborateDataFromDevice(data) {
    if(this.requestedStatus === REQUESTED_STATUS.DISCONNECTED){
      return
    }
    this.logger.debug(`Data from device ${this.deviceName}: %o`,data);
    this.deviceValues.on = data.dps[PARAMS_MAP.ON_OFF];
    this.deviceValues.consumption = data.dps[PARAMS_MAP.CONSUMPTION] / 10;
    if (this.firstResponseAfterConnection) {
      this.firstResponseAfterConnection = false;
      return;
    }
    if (this.pollingRun) {
      if (this.deviceValues.consumption > 0) {
        this.deviceValues.firstZero = false
        this.writeDataIntoDB();
        this._startFastPolling();
      } else if (!this.deviceValues.firstZero) {
        this.deviceValues.firstZero = true
        this.writeDataIntoDB();
        this._startFastPolling();
      }
      else{
          this._startSlowPolling();
        }
      }
  }

  writeDataIntoDB() {
    this.dbConnection.writeFloat({
      deviceName: this.deviceName,
      fieldName: 'power',
      fieldValue: this.deviceValues.consumption
    });
  }

  writeEventIntoDb(event) {
    this.dbConnection.writeEvent({
      deviceName: this.deviceName,
      fieldName: 'events',
      fieldValue: event.str,
      fieldValueType: 'type',
      fieldTypeValue: event.type,
    });
  }

  deleteData() {
    this.dbConnection.deleteData({deviceName: this.deviceName});
  }
}

module.exports = TuyAPIDriver;