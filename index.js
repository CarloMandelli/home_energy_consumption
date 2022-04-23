const logger = require('pino')({level:process.env.LOG_LEVEL})
const Device = require('./utility/device.js');
const schedule = require('./utility/scheduler.js');

const device = new Device(logger)

function activateScheduledProcess(devices) {
  const scheduledTime = JSON.parse(process.env.SCHEDULED)
  const startRule = schedule.createSchedule(scheduledTime.start, scheduledTime.timezone);
  const stopRule = schedule.createSchedule(scheduledTime.end, scheduledTime.timezone);
  schedule.applyFunctionToRule(startRule, device.startAllDevices.bind(device), devices)
  schedule.applyFunctionToRule(stopRule, device.stopAllDevices.bind(device), devices)
  schedule.checkIfCouldStartNow(scheduledTime, device.startAllDevices.bind(device), devices)
}

function activateAlwaysEnabledProcess(devices) {
  device.startAllDevices(devices)
}

function go() {
  const devices = device.createDevices()
  const scheduledTime = process.env.SCHEDULED
  if (scheduledTime) {
    activateScheduledProcess(devices)
  } else {
    activateAlwaysEnabledProcess(devices)
  }
}

function testContainer() {
  setTimeout(testContainer, 10000)
}

if (process.env && process.env.TEST == 'TRUE') {
  testContainer()
} else {
  go()
}


//devices.deleteData();