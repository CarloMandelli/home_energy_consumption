const {InfluxDB, Point} = require('@influxdata/influxdb-client')
const {DeleteAPI} = require("@influxdata/influxdb-client-apis");

const WRITE_TYPE = {
  EVENT : "event",
  DATA : "data"
};
class InfluxDao {

  constructor(deviceName, logger) {
    this.deviceName = deviceName
    this.org = process.env.INFLUX_ORG
    this.bucket = process.env.INFLUX_BUCKET
    this.client = new InfluxDB({url: `${process.env.INFLUX_HOST}`, token: process.env.INFLUX_TOKEN})
    this.queryApi = this.client.getQueryApi(this.org)
    this.writeApi = this.client.getWriteApi(this.org, this.bucket)
    this.deleteAPI = new DeleteAPI(this.client)
    this.logger = logger
  }

  _writePoint(point, type){
    this.writeApi.writePoint(point)
    this.writeApi
      .flush()
      .then(() => {
        this.logger.debug(`FINISHED write ${type} ${this.deviceName}`)
      })
      .catch(e => {
        this.logger.error(`Finished write ${type} for device ${this.deviceName} error:%o`,e)
      })
  }

  writeFloat(params){
    const point = new Point(params.deviceName).floatField(params.fieldName, params.fieldValue)
    this._writePoint(point, WRITE_TYPE.DATA)
  }

  writeEvent(params){
    const point = new Point(params.deviceName).stringField(params.fieldName, params.fieldValue)
    point.intField(params.fieldValueType, params.fieldTypeValue)
    this._writePoint(point, WRITE_TYPE.EVENT)
  }

  readData(params){
    const query = `from(bucket: "HomeAutomation") |> range(start: -1h)`
    this.queryApi.queryRows(query, {
      next(row, tableMeta) {
        const o = tableMeta.toObject(row)
        console.log(`${o._time} ${o._measurement}: ${o._field}=${o._value}`)
      },
      error(error) {
        this.logger.error(`Finished readData for device ${this.deviceName} error:%o`,error)
      },
      complete() {
        this.logger.info(`Finished readData for device ${this.deviceName}`)
      },
    })
  }

  deleteData(params){
    const stop = new Date()
    const start = new Date(stop.getTime() - 36 * 60 * 60 * 1000)

    this.deleteAPI.postDelete({
      org: this.org,
      bucket: this.bucket,
      body: {
        start: start.toISOString(),
        stop: stop.toISOString(),
        predicate: `_measurement="${params.deviceName}"`,
      },
    }).then(() => {
      this.logger.info(`FINISHED deleteData ${this.deviceName}`)
    })
      .catch(e => {
        this.logger.error(`Finished deleteData for device ${this.deviceName} error:%o`,e)
      })
  }
}

module.exports = InfluxDao;