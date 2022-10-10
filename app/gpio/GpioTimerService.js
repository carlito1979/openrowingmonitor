'use strict'
/*
  Open Rowing Monitor, https://github.com/laberning/openrowingmonitor

  Measures the time between impulses on the GPIO pin. Started in a
  separate thread, since we want the measured time to be as close as
  possible to real time.
*/
import process from 'process'
import pigpio from 'pigpio'
import os from 'os'
import config from '../tools/ConfigManager.js'
import log from 'loglevel'

log.setLevel(config.loglevel.default)

export function createGpioTimerService () {
  // Import the settings from the settings file
  let triggeredFlank = config.gpioTriggeredFlank
  let pollingInterval = config.gpioPollingInterval
  let minimumPulseLength = config.gpioMinimumPulseLength

  if (config.gpioPriority) {
    // setting top (near-real-time) priority for the Gpio process, as we don't want to miss anything
    log.debug(`Gpio-service: Setting priority to ${config.gpioPriority}`)
    try {
      // setting priority of current process
      os.setPriority(config.gpioPriority)
    } catch (err) {
      log.debug('Gpio-service: FAILED to set priority of Gpio-Thread, are root permissions granted?')
    }
  }

  const Gpio = pigpio.Gpio

  // Configure the gpio polling frequency
  pigpio.configureClock(pollingInterval, pigpio.CLOCK_PCM)

  // Configure the sensor readings for one of the Gpio pins of Raspberry Pi
  const sensor = new Gpio(
    config.gpioPin, {
    mode: Gpio.INPUT,
    pullUpDown: Gpio.PUD_UP,
    alert: true
  })

  // Set a minumum time a level must be stable before an alert event is emitted.
  sensor.glitchFilter(minimumPulseLength);
  log.debug(`Gpio-service: pin number ${config.gpioPin}, polling interval ${pollingInterval} us, triggered on ${triggeredFlank} flank, minimal pulse time ${minimumPulseLength} us`)

  // set the default value
  let previousTick = 0

  // Define the alert handler
  sensor.on('alert', (level, currentTick) => {
    if ((triggeredFlank === 'Both') || (triggeredFlank === 'Down' && level === 0) || (triggeredFlank === 'Up' &&  level === 1)) {
      const currentDt = ((currentTick >> 0) - (previousTick >> 0)) / 1e6
      previousTick = currentTick
      process.send(currentDt)
    }
  })
}
createGpioTimerService()
