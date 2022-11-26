'use strict'
/*
  Open Rowing Monitor, https://github.com/laberning/openrowingmonitor

  This manager creates a module to listen to ANT+ devices.
  This currently can be used to get the heart rate from ANT+ heart rate sensors.

  Requires an ANT+ USB stick, the following models might work:
  - Garmin USB or USB2 ANT+ or an off-brand clone of it (ID 0x1008)
  - Garmin mini ANT+ (ID 0x1009)
*/
import log from 'loglevel'
import Ant from 'gd-ant-plus'
import EventEmitter from 'node:events'

function createAntReceiver(antStick) {
  const stick = antStick
  const emitter = new EventEmitter()
  const heartRateSensor = new Ant.HeartRateSensor(stick)
  heartRateSensor.on('hbData', (data) => {
    emitter.emit('heartrateMeasurement', { heartrate: data.ComputedHeartRate, batteryLevel: data.BatteryLevel })
  })
  stick.on('startup', () => {
    heartRateSensor.attach(0,0)
  })
  heartRateSensor.on('attached', () => {
    log.info('Ant+ HRM Attached')
  })
  heartRateSensor.on('detached', () => {
    log.info('Ant+ HRM Detached')
  })
  return Object.assign(emitter, {
  })

}

export { createAntReceiver }