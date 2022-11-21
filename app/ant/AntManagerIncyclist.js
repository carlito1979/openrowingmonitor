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

function createAntManager (deviceID=-1) {
  const emitter = new EventEmitter()
  const ant = new AntDevice({startupTimeout:2000, debug:true, logger:console})
  const heartRateSensor = new Ant()

  const opened =  ant.open()
  if (!opened) {
    log.info('could not open ant stick')
    return;
  }

  const channel =  ant.getChannel()
  if (!channel) {
    log.info('could not open channel')
    return;
  }

  if (deviceID === -1) { //scanning for device
    log.info('scanning for sensors')
    const sensor = new Ant()
    channel.on('data', onData)
    channel.startScanner()
    channel.attach(sensor)
  }
  else { //device ID known
    log.info('connecting with id=${deviceID}')
    const sensor = new Ant(deviceID)
    channel.on('data', onData)
    const started =  channel.startSensor(sensor)
    if (!started) {
      log.info('could not start sensor')
      ant.close()
    }
  }

  function onData(profile, deviceID, data => {
    emitter.emit('heartrateMeasurement', { heartrate: data.ComputedHeartRate, batteryLevel: data.BatteryLevel })
  })

  return Object.assign(emitter, {
  })
}
/*








  //const antStick = new antDevice()
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

}
*/

export { createAntManager }
