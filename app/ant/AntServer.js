'use strict'
/*
  Open Rowing Monitor, https://github.com/laberning/openrowingmonitor

  This manager creates a module to listen to ANT+ devices.
  This creates a module that can broadcast rowing metrics over ANT+ via the Fitness Equipment Profile
  Once connected to a compatible Garmin Watch your indoor rowing activity will include Strokes, Stroke Rate, Pace/Speed and Power information

  This code is based on the previous work of PTX2 on Gymnasticon to build an interface between obsolete/propriertary exercise bikes and training apps like Zwift
  https://github.com/ptx2/gymnasticon

  Requires an ANT+ USB stick, the following models might work:
  - Garmin USB or USB2 ANT+ or an off-brand clone of it (ID 0x1008)
  - Garmin mini ANT+ (ID 0x1009)
*/
import log from 'loglevel'
import Ant from 'gd-ant-plus'
import {Timer} from './timer.js'

const DEVICE_TYPE = 0x11; // Ant FE-C device
const DEVICE_NUMBER = 1;
const PERIOD = 8192; // 8192/32768 ~4hz
const RF_CHANNEL = 57; // 2457 MHz
const BROADCAST_INTERVAL = PERIOD / 32768; // seconds
// this defines the series order that we broadcast the pages in order to meet Ant+ Spec requirements
const PAGE_INTERLEAVING = [16,16,22,17,16,16,17,22,16,16,22,17,16,16,17,22,16,16,22,17,16,16,17,22,16,16,22,17,16,16,17,22,16,16,22,17,16,16,17,22,16,16,22,17,16,16,17,22,16,16,22,17,16,16,17,22,16,16,22,17,16,16,17,22,80,80,16,16,22,17,16,16,17,22,16,16,22,17,16,16,17,22,16,16,22,17,16,16,17,22,16,16,22,17,16,16,17,22,16,16,22,17,16,16,17,22,16,16,22,17,16,16,17,22,16,16,22,17,16,16,17,22,16,16,22,17,16,16,17,22,81,81]
const ASLEEP_STATE =    0b0010000
const READY_STATE =     0b0100000
const IN_USE_STATE =    0b0110000
const FINISHED_STATE =  0b1010000
const FLIP_LAP =       0b10000000 // used to flip the lap bit
const PAGE_16_FLAGS =      0b0100 // Flags for some of the information being sent to Watch - No Heart Rate Sent, Distance Sent, Speed is Real
const PAGE_22_FLAGS =      0b0001 // Flags for some of the informaiton being sent to Watch - Indicates that rowing machine is sending stroke count to watch


const defaults = {
  deviceId: 11234,
  channel: 1,
}

/**
 * 
 * Handles communication with apps (e.g. Zwift) using the ANT+ Bicycle Power
 * profile (instantaneous cadence and power).
 */
export class AntServer {
  /**
   * Create an AntServer instance.
   * @param {Ant.USBDevice} antStick - ANT+ device instance
   * @param {object} options
   * @param {number} options.channel - ANT+ channel
   * @param {number} options.deviceId - ANT+ device id
   */
  constructor(antStick, options = {}) {
    const opts = {...defaults, ...options};
    this.stick = antStick;
    this.deviceId = opts.deviceId;
    this.channel = opts.channel;
    
    this.eventCount = 0;
    this.accumulatedPower = 0;

    this.sessionStatus = 'WaitingForStart'
    this.totalMovingTime = 0
    this.accumulatedTime = 0
    this.totalNumberOfStrokes = 0
    this.accumulatedStrokes = 0
    this.totalLinearDistance = 0
    this.accumulatedDistance = 0
    this.cycleStrokeRate = 0
    this.cycleLinearVelocity = 0
    this.cyclePower = 0
    this.dragFactor = 0
    this.capabilitiesState = READY_STATE // 36 = ready, 52 = in use, 84 = finished
    this.driveLength = 0

    this.broadcastInterval = new Timer(BROADCAST_INTERVAL);
    this.broadcastInterval.on('timeout', this.onBroadcastInterval.bind(this));
    this._isRunning = false;
    this._stickExists = false;
  }

  /**
   * Start the ANT+ server (setup channel and start broadcasting).
   */
  start() {
    const {stick, channel, deviceId} = this;
    const messages = [
      Ant.Messages.assignChannel(channel, 'transmit'),
      Ant.Messages.setDevice(channel, deviceId, DEVICE_TYPE, DEVICE_NUMBER),
      Ant.Messages.setFrequency(channel, RF_CHANNEL),
      Ant.Messages.setPeriod(channel, PERIOD),
      Ant.Messages.openChannel(channel),
    ];
    log.info(`ANT+ server start [deviceId=${deviceId} channel=${channel}]`);
    for (let m of messages) {
      stick.write(m);
    }
    this.broadcastInterval.reset();
    this._isRunning = true;
  }

  confirmStickExists() {
    log.debug('ANT+ Stick Exists')
    this._stickExists = true
  }

  get stickExists() {
    return this._stickExists;
  }

  get isRunning() {
    return this._isRunning;
  }

  /**
   * Stop the ANT+ server (stop broadcasting and unassign channel).
   */
  stop() {
    const {stick, channel, deviceId} = this;
    log.info(`ANT+ server stopped [deviceId=${deviceId} channel=${channel}]`);

    this.broadcastInterval.cancel();
    const messages = [
      Ant.Messages.closeChannel(channel),
      Ant.Messages.unassignChannel(channel),
    ];
    for (let m of messages) {
      stick.write(m);
    }
    this._isRunning = false
    this.notifyStatus()
  }

  /**
   * Update metrics from rowing machine
   * Current Metrics passed through are:
   * @param {object} metrics
   * @param metrics.sessiontype // can be ignored?
   * @param metrics.sessionStatus // will need to be converted?
   * @param metrics.strokeState // will need to be converted?
   * @param metrics.totalMovingTime // will use?
   * @param metrics.totalMovingTimeFormatted
   * @param metrics.totalNumberOfStrokes // will use?
   * @param metrics.totalLinearDistance // will use?
   * @param metrics.totalLinearDistanceFormatted
   * @param metrics.strokeCalories
   * @param metrics.strokeWork
   * @param metrics.totalCalories
   * @param metrics.totalCaloresPerMinute
   * @param metrics.totalCaloresPerHour
   * @param metrics.cycleDuration // in seconds, this is stroke duration. won't be used?
   * @param metrics.cycleStrokeRate // this is stroke rate in SPM
   * @param metrics.cycleDistance // meters
   * @param metrics.cycleLinearVelocity // m/s
   * @param metrics.cyclePace // seconds/500m
   * @param metrics.cyclePaceFormatted
   * @param metrics.cyclePower // watts
   * @param metrics.cycleProjectedEndTime
   * @param metrics.cycleProjectedEndLinearDistance
   * @param metrics.driveDuration // in seconds
   * @param metrics.driveLength // meters of chain movement
   * @param metrics.driveDistance
   * @param metrics.driveAverageHandleForce
   * @param metrics.drivePeakHandleForce
   * @param metrics.driveHandleForceCurve
   * @param metrics.driveHandleVelocityCurve
   * @param metrics.driveHandlePowerCurve
   * @param metrics.recoveryDuration
   * @param metrics.dragFactor // may use this to send resistance value?
   * @param metrics.instantPower // watts - do we use this instead of cycle power? Probably?
   * @param metrics.heartrate
   * @param metrics.heartrateBatteryLevel
  0x10 General Data 8.5.2
    Equipment Type 0x16 (Rower)
    Elapsed Time 1 byte - accumulated, but rolls over so &= 0xFF. 1 = 0.25sec
    Distance Travelled 1 byte- accumulated, but rolls over so &= 0xFF. 1 = 1m
    Speed - translate 500m pace into m/s value 1 = 0.001 m/s 2 bytes 2min 500m time = 4.170 m/s = 0x104A
    Capabilities/FE State
  0x16 Specific Rower Data 8.6.4
    Stroke Count 1 byte - accumulated with roll over so &- 0xFF 1 = 1 stroke
    Cadence/Stroke Rate 1 byte strokes/min 
    Instant Power 2 bytes - 1 = 1 watt, 240W = 0xF0
    Capabilities/FE State
   */
  notifyMetrics(type, metrics) {

    this.totalMovingTime = metrics.totalMovingTime // in seconds, total session time
    this.totalNumberOfStrokes = metrics.totalNumberOfStrokes // in integers, total number of strokes in session
    this.totalLinearDistance = metrics.totalLinearDistance // in meters
    this.cycleStrokeRate = Math.round(metrics.cycleStrokeRate) // stroke rate per minute rounded
    this.cycleLinearVelocity = Math.round(metrics.cycleLinearVelocity *1000) // each unit = 0.001 m/s
    this.cyclePower = Math.round(metrics.cyclePower) // we could use instantPower instead?
    this.dragFactor = Math.round(metrics.dragFactor -50) // drag factor as a raw resistance value (each unit = 0.5%)
    this.driveLength = Math.round(metrics.driveLength * 100) // used for stroke length. May be the wrong metric? (each unit = 0.01 m)
    // update sessionState and capabilities state
    // first we get the current lap bit state
    let lapBit = this.capabilitiesState &= FLIP_LAP
    // "flip" the lap switch if needed
    // we essentially do this anytime the last session status doesn't match the new session status
    if (this.sessionStatus != metrics.sessionStatus) {
      lapBit ^= FLIP_LAP
      log.debug('Lap Bit Flipped')
    }
    switch (metrics.sessionStatus) {
      case 'Rowing':
        this.capabilitiesState = IN_USE_STATE + lapBit
        break
      case 'WaitingForStart':
        this.capabilitiesState = READY_STATE + lapBit
        break
      case 'Paused':
        this.capabilitiesState = FINISHED_STATE + lapBit
        break
      case 'Stopped':
        this.capabilitiesState = FINISHED_STATE + lapBit
        break
      default:
        log.error(`No Valid Session Status result found for ${this.sessionStatus}`)
        this.capabilitiesState = READY_STATE + lapBit
        break
    }
    this.sessionStatus = metrics.sessionStatus
  }

  /**
   * The Server has reset metrics
   */
  notifyStatus(type) {
    this.resetMetrics()
  }

  resetMetrics() {
    this.eventCount = 0;
    this.accumulatedPower = 0;

    this.sessionStatus = 'WaitingForStart'
    this.totalMovingTime = 0
    this.accumulatedTime = 0
    this.totalNumberOfStrokes = 0
    this.accumulatedStrokes = 0
    this.totalLinearDistance = 0
    this.accumulatedDistance = 0
    this.cycleStrokeRate = 0
    this.cycleLinearVelocity = 0
    this.cyclePower = 0
    this.dragFactor = 0
    let lapBit = this.capabilitiesState &= FLIP_LAP // treat a reset like a lap
    lapBit ^= FLIP_LAP
    this.capabilitiesState = READY_STATE + lapBit
    this.driveLength = 0
    // we may one day use this to turn off broadcasting or stopping the machine?
  }


  /**
   * Broadcast information over ANT+.
   * Broadcast Rate is 4Hz
   * 
   */
  onBroadcastInterval() {
    const {stick, channel} = this
    this.accumulatedDistance = this.totalLinearDistance
    this.accumulatedDistance &= 0xFF
    this.accumulatedStrokes = this.totalNumberOfStrokes
    this.accumulatedStrokes &= 0xFF
    this.accumulatedTime = Math.trunc(this.totalMovingTime * 4) // each second = 4 units for elapsed time in Ant+
    this.accumulatedTime &= 0xFF
    var data = []
    let lapBit = this.capabilitiesState &= FLIP_LAP
    var hexString = ''
    // determine which data page to write
    switch (PAGE_INTERLEAVING[this.eventCount]) {
      case 16: // 0x10 - General FE Data (twice a second)
        data = [
          channel,
          0x10, // Page 16
          0x16, // Rowing Machine (22)
          ...Ant.Messages.intToLEHexArray(this.accumulatedTime, 1), // elapsed time
          ...Ant.Messages.intToLEHexArray(this.accumulatedDistance, 1), // distance travelled
          ...Ant.Messages.intToLEHexArray(this.cycleLinearVelocity, 2), // speed in 0.001 m/s
          0xFF, // heart rate not being sent
          ...Ant.Messages.intToLEHexArray((this.capabilitiesState +PAGE_16_FLAGS), 1)
        ]
        /*
        if (this.sessionStatus === 'Rowing') {
          log.debug(`Page 16 Data Sent. Event=${this.eventCount}. Time=${this.accumulatedTime}. Distance=${this.accumulatedDistance}. Speed=${this.cycleLinearVelocity}.`) // debug code
          hexString = Ant.Messages.intToLEHexArray(this.cycleLinearVelocity, 2)
          log.debug(`Hex Time=0x${this.accumulatedTime.toString(16)}. Hex Distance=0x${this.accumulatedDistance.toString(16)}. Hex Speed=0x${hexString}.`) // debug code
        }
        */
        break
      case 17: // 0x11 - General Settings Page (once a second)
        data = [
          channel,
          0x11, // Page 17
          0xFF, // Reserved
          0xFF, // Reserved
          ...Ant.Messages.intToLEHexArray(this.driveLength, 1), // Stroke Length in 0.01 m
          0x7FFF, // Incline (Not Used)
          ...Ant.Messages.intToLEHexArray(this.dragFactor, 1),// Drag Factor Interpreted as Resistance. DF 50 = 0%, DF 250 = 100% (e.g., DF 130 = 40% resistance) each unit = 0.5%
          ...Ant.Messages.intToLEHexArray(this.capabilitiesState, 1)
        ]
        /*
        if (this.sessionStatus === 'Rowing') {
          log.debug(`Page 17 Data Sent. Event=${this.eventCount}. Stroke Length=${this.driveLength}. Drag Factor=${this.dragFactor}.`) // debug code
          log.debug(`Hex Stroke Length=0x${this.driveLength.toString(16)}. Hex Drag Factor=0x${this.dragFactor.toString(16)}.`) // debug code
        }
        */
        break
      case 22: // 0x16 - Specific Rower Data (once a second)
        data = [
          channel,
          0x16, // Page 22
          0xFF, // Reserved
          0xFF, // Reserved
          ...Ant.Messages.intToLEHexArray(this.accumulatedStrokes, 1), // Stroke Count
          ...Ant.Messages.intToLEHexArray(this.cycleStrokeRate, 1), // Cadence / Stroke Rate
          ...Ant.Messages.intToLEHexArray(this.cyclePower, 2), // Instant Power (2 bytes)
          ...Ant.Messages.intToLEHexArray((this.capabilitiesState +PAGE_22_FLAGS), 1)
        ]
        /*
        if (this.sessionStatus === 'Rowing') {
          log.debug(`Page 22 Data Sent. Event=${this.eventCount}. Strokes=${this.accumulatedStrokes}. Stroke Rate=${this.cycleStrokeRate}. Power=${this.cyclePower}`) // debug code
          hexString = Ant.Messages.intToLEHexArray(this.cyclePower, 2)
          log.debug(`Hex Strokes=0x${this.accumulatedStrokes.toString(16)}. Hex Stroke Rate=0x${this.cycleStrokeRate.toString(16)}. Hex Power=0x${hexString}. Lap Bit=0x${lapBit.toString(2)}`) // debug code
        }
        */
        break
      case 80: // 0x50 - Common Page for Manufacturers Identification (approx twice a minute)
        data = [
          channel,
          0x50, // Page 80
          0xFF, // Reserved
          0xFF, // Reserved
          0x01, // Hardware Revision
          0x00FF, // Manufacturer ID (value 255 = Development ID)
          0x0001 // Model Number 
        ]
        break
      case 81: // 0x51 - Common Page for Product Information (approx twice a minute)
        data = [
          channel,
          0x51, // Page 81
          0xFF, // Reserved
          0xFF, // SW Revision (Supplemental)
          0x0A, // SW Version
          0xFFFFFFFF // Serial Number (None)
        ]
        break
      default:
        log.error(`No Valid PAGE_INTERLEAVING result found for ${this.eventCount}`)
        return
    }
    const message = Ant.Messages.broadcastData(data)
    stick.write(message)
    this.eventCount++
    // roll over page list if needed
    if (this.eventCount === PAGE_INTERLEAVING.length) {
      this.eventCount = 0
    }
  }

}