const schedule = require('node-schedule');
const moment = require('moment-timezone')

function createSchedule(scheduled, timezone) {
  const rule = new schedule.RecurrenceRule();
  rule.hour = scheduled.hour;
  rule.minute = scheduled.minute;
  rule.tz = timezone;
  return rule
}

function applyFunctionToRule(rule, fn, fnParams) {
  schedule.scheduleJob(rule, function () {
    fn(fnParams)
  });
}

function checkIfCouldStartNow(scheduledTime, fn, fnParams){
  const startDate = scheduledTime.start.hour+scheduledTime.start.minute
  const endDate = scheduledTime.end.hour+scheduledTime.end.minute
  const actualDate = moment().tz('Europe/Rome').format('HHmm')
  if(startDate < actualDate &&
    actualDate < endDate){
    fn(fnParams)
  }

}

module.exports = {createSchedule, applyFunctionToRule, checkIfCouldStartNow}