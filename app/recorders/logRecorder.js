'use strict'
/*
  Open Rowing Monitor, https://github.com/laberning/openrowingmonitor

  This Module captures the metrics of a rowing session and persists them.
*/
import log from 'loglevel'
import { secondsToTimeString } from '../tools/Helper.js'

function createLogRecorder (config) {
  let heartRate = 0

  // This function handles all incomming commands. As all commands are broadasted to all application parts,
  // we need to filter here what the WorkoutRecorder will react to and what it will ignore
  async function handleCommand (commandName) {
    switch (commandName) {
      case ('start'):
        break
      case ('startOrResume'):
        break
      case ('pause'):
        break
      case ('stop'):
        break
      case ('reset'):
        break
      case 'shutdown':
        break
      default:
        log.error(`Logecorder: Recieved unknown command: ${commandName}`)
    }
  }

  function setBaseFileName (baseFileName) {
  }

  // initiated when a new heart rate value is received from heart rate sensor
  async function recordHeartRate (value) {
    heartRate = value.heartrate
  }

  function recordRowingMetrics (metrics) {
    switch (true) {
      case (metrics.metricsContext.isSessionStart):
        logMetrics(metrics)
        break
      case (metrics.metricsContext.isSessionStop):
        logMetrics(metrics)
        break
      case (metrics.metricsContext.isPauseStart):
        logMetrics(metrics)
        break
      case (metrics.metricsContext.isDriveStart):
        logMetrics(metrics)
        break
    }
  }

  function logMetrics (metrics) {
    log.info(`stroke: ${metrics.totalNumberOfStrokes}, dist: ${metrics.totalLinearDistance.toFixed(1)}m, heartrate ${heartRate} BPM` +
      `, pace: ${secondsToTimeString(metrics.cyclePace)}/500m, stroke dist: ${metrics.cycleDistance.toFixed(1)}m, strokerate: ${metrics.cycleStrokeRate.toFixed(1)} SPM` +
      `, drive dur: ${metrics.driveDuration.toFixed(2)}s, rec. dur: ${metrics.recoveryDuration.toFixed(2)}s, stroke dur: ${metrics.cycleDuration.toFixed(2)}s`)
  }

  return {
    handleCommand,
    setBaseFileName,
    recordRowingMetrics,
    recordHeartRate
  }
}

export { createLogRecorder }
