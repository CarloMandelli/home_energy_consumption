const TuyDriver = require("../devices/tuya/tuyaDriver");

class Device {
  constructor(logger) {
    this.logger = logger;
  }

  createDevices() {
    const devices = eval(process.env.DEVICES)
    let deviceLinked = []
    devices.forEach((device) => deviceLinked.push(new TuyDriver(device, this.logger)));
    return deviceLinked
  }

  async _startDevice(device) {
    try {
      await device.setup()
    } catch (e) {
      this.logger.error(`Error on setup for device ${device.deviceName}! %o`, e);
      return
    }
    try {
      await device.connect()
    } catch (e) {
      this.logger.error(`Error on connect for device ${device.deviceName}! %o`, e);
      return
    }
    device.startPolling()
  }

  startAllDevices(devices) {
    const me = this
    devices.forEach(async (device) => {
      this.logger.info(`Start device ${device.deviceName}`)
      await me._startDevice(device)
    });
  }

  stopAllDevices(devices) {
    devices.forEach((device) => {
      this.logger.info(`Stop device ${device.deviceName}`)
      device.stopPolling()
      device.disconnect()
    });
  }

  deleteData() {
    const deviceLinked = createDevices()
    deviceLinked.forEach((device) => {
      device.deleteData()
    });
  }
}

module.exports = Device