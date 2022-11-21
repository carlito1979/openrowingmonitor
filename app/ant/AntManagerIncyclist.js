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
import Ant from 'incyclist-ant-plus'
import AntDevice from 'incyclist-ant-plus/lib/bindings/index.js'
import EventEmitter from 'node:events'

function createAntManager () {
  const emitter = new EventEmitter()
  const antDevice = new AntDevice()

  const antStick = new antDevice()
  // it seems that we have to use two separate heart rate sensors to support both old and new
  // ant sticks, since the library requires them to be bound before open is called
  const heartrateSensor = new Ant.HeartRateSensor(antStick)

  heartrateSensor.on('hbData', (data) => {
    emitter.emit('heartrateMeasurement', { heartrate: data.ComputedHeartRate, batteryLevel: data.BatteryLevel })
  })

  antStick.on('startup', () => {
    log.info('classic ANT+ stick found')
    heartrateSensor.attach(0, 0)
  })

  antStick.on('shutdown', () => {
    log.info('classic ANT+ stick lost')
  })

  if (!antStick.open()) {
    log.debug('classic ANT+ stick NOT found')
  }

  return Object.assign(emitter, {
  })
}

export { createAntManager }
