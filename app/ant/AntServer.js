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
import {Timer} from './timer.js'

const DEVICE_TYPE = 0x11; // Ant FE-C device
const DEVICE_NUMBER = 1;
const PERIOD = 8192; // 8192/32768 ~4hz
const RF_CHANNEL = 57; // 2457 MHz
const BROADCAST_INTERVAL = PERIOD / 32768; // seconds
// this defines the series order that we broadcast the pages in order to meet Ant+ Spec requirements
//const PAGE_INTERLEAVING = [16,16,22,17,16,16,17,22,16,16,22,17,16,16,17,22,16,16,22,17,16,16,17,22,16,16,22,17,16,16,17,22,16,16,22,17,16,16,17,22,16,16,22,17,16,16,17,22,16,16,22,17,16,16,17,22,16,16,22,17,16,16,17,22,80,80,16,16,22,17,16,16,17,22,16,16,22,17,16,16,17,22,16,16,22,17,16,16,17,22,16,16,22,17,16,16,17,22,16,16,22,17,16,16,17,22,16,16,22,17,16,16,17,22,16,16,22,17,16,16,17,22,16,16,22,17,16,16,17,22,81,81]
const PAGE_INTERLEAVING = [16,16,22,22,16,16,22,22,16,16,22,22,16,16,22,22,16,16,22,22,16,16,22,22,16,16,22,22,16,16,22,22,16,16,22,22,16,16,22,22,16,16,22,22,16,16,22,22,16,16,22,22,16,16,22,22,16,16,22,22,16,16,22,22,80,80,16,16,22,22,16,16,22,22,16,16,22,22,16,16,22,22,16,16,22,22,16,16,22,22,16,16,22,22,16,16,22,22,16,16,22,22,16,16,22,22,16,16,22,22,16,16,22,22,16,16,22,22,16,16,22,22,16,16,22,22,16,16,22,22,81,81]
const ASLEEP_STATE = 0b00010000
const READY_STATE = 0b00100000
const IN_USE_STATE = 0b00110000
const FINISHED_STATE = 0b01010000
const FLIP_LAP = 0b10000000 // used to flip the lap bit (future enhancement)
const PAGE_16_FLAGS = 0b0100 // Flags for some of the information being sent to Watch - No Heart Rate Sent, Distance Sent, Speed is Real
const PAGE_22_FLAGS =0b0001 // Flags for some of the informaiton being sent to Watch - Indicates that rowing machine is sending stroke count to watch


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
    
    this.power = 0;
    this.cadence = 0;

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

  get isRunning() {
    return this._isRunning;
  }

  /**
   * Stop the ANT+ server (stop broadcasting and unassign channel).
   */
  stop() {
    const {stick, channel} = this;
    this.broadcastInterval.cancel();
    const messages = [
      Ant.Messages.closeChannel(channel),
      Ant.Messages.unassignChannel(channel),
    ];
    for (let m of messages) {
      stick.write(m);
    }
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
    
    this.sessionStatus = metrics.sessionStatus
    this.totalMovingTime = metrics.totalMovingTime // in seconds, total session time
    this.totalNumberOfStrokes = metrics.totalNumberOfStrokes // in integers, total number of strokes in session
    this.totalLinearDistance = metrics.totalLinearDistance // in meters
    this.cycleStrokeRate = metrics.cycleStrokeRate
    this.cycleLinearVelocity = metrics.cycleLinearVelocity // in m/s
    this.cyclePower = metrics.cyclePower // we could use instantPower instead?
    this.dragFactor = Math.round(metrics.dragFactor -50) // drag factor as a raw resistance value (each unit = 0.5%)
    this.driveLength = metrics.driveLength // used for stroke length. May be the wrong metric?
    // update sessionState and capabilities state
    switch (this.sessionStatus) {
      case 'Rowing':
        this.capabilitiesState = IN_USE_STATE
        break
      case 'WaitingForStart':
        this.capabilitiesState = READY_STATE
        break
      case 'Paused':
        this.capabilitiesState = FINISHED_STATE
        break
      case 'Stopped':
        this.capabilitiesState = FINISHED_STATE
        break
      default:
        log.error(`No Valid Session Status result found for ${this.sessionStatus}`)
        this.capabilitiesState = READY_STATE
        break
    }
  }

  /**
   * The Server has reset metrics
   */
  notifyStatus(type) {
    this.eventCount = 0;
    this.accumulatedPower = 0;
    
    this.power = 0;
    this.cadence = 0;

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
    this.capabilitiesState = READY_STATE 
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
          ...Ant.Messages.intToLEHexArray(Math.round(this.cycleLinearVelocity *1000), 2), // speed in m/s *1000
          0xFF, // heart rate not being sent
          ...Ant.Messages.intToLEHexArray((this.capabilitiesState +PAGE_16_FLAGS), 1)
        ]
        if (this.sessionStatus === 'Rowing') {
          log.debug(`Page 16 Data Sent. Event=${this.eventCount}. Time=${this.accumulatedTime}. Distance=${this.accumulatedDistance}. Speed=${Math.round(this.cycleLinearVelocity *1000)}.`)
          log.debug(`Hex Time=0x${this.accumulatedTime.toString(16)}. Hex Distance=0x${this.accumulatedDistance.toString(16)}. Hex Speed=0x${Math.round(this.cycleLinearVelocity *1000).toString(16)}.`)
        }
        break
      case 17: // 0x11 - General Settings Page (once a second)
        data = [
          channel,
          0x11, // Page 17
          0xFF, // Reserved
          0xFF, // Reserved
          ...Ant.Messages.intToLEHexArray(Math.round(this.driveLength * 100), 1), // Stroke Length
          0x7FFF, // Incline (Not Used)
          ...Ant.Messages.intToLEHexArray(this.dragFactor, 1),// Drag Factor Interpreted as Resistance. DF 50 = 0%, DF 250 = 100% (e.g., DF 130 = 40% resistance) each unit = 0.5%
          ...Ant.Messages.intToLEHexArray(this.capabilitiesState, 1)
        ]
        if (this.sessionStatus === 'Rowing') {
          log.debug(`Page 17 Data Sent. Event=${this.eventCount}. Stroke Length=${Math.round(this.driveLength * 100)}. Drag Factor=${this.dragFactor}.`)
          log.debug(`Hex Stroke Length=0x${Math.round(this.driveLength * 100).toString(16)}. Hex Drag Factor=0x${this.dragFactor.toString(16)}.`)
        }
        break
      case 22: // 0x16 - Specific Rower Data (once a second)
        data = [
          channel,
          0x16, // Page 22
          0xFF, // Reserved
          0xFF, // Reserved
          ...Ant.Messages.intToLEHexArray(this.accumulatedStrokes, 1), // Stroke Count
          ...Ant.Messages.intToLEHexArray(Math.round(this.cycleStrokeRate), 1), // Cadence / Stroke Rate
          ...Ant.Messages.intToLEHexArray(Math.round(this.cyclePower *100), 2), // Instant Power (2 bytes) (Documentation is misleading? Looks like number needs to be multiplied by a factor of 100)
          ...Ant.Messages.intToLEHexArray((this.capabilitiesState +PAGE_22_FLAGS), 1)
        ]
        if (this.sessionStatus === 'Rowing') {
          log.debug(`Page 22 Data Sent. Event=${this.eventCount}. Strokes=${this.accumulatedStrokes}. Stroke Rate=${Math.round(this.cycleStrokeRate)}. Power=${Math.round(this.cyclePower *100)}`)
          hexString = Ant.Messages.intToLEHexArray(Math.round(this.cyclePower *100), 2)
          log.debug(`Hex Strokes=0x${this.accumulatedStrokes.toString(16)}. Hex Stroke Rate=0x${this.cycleStrokeRate.toString(16)}. Hex Power=0x${hexString}`)
        }
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


/*
Equipment Type: Rower = 22 / 0x16
Data to send
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



8.5.2.2 Elapsed Time

8.5.2.3 Distance Travelled

8.5.2.4 Speed
2 byte value in 0.001 m/s


8.5.2.6 Capabilities Bit Field
0100: 4 0x4
No HR Source, Transmitting Distance Travelled and Real Speed


8.5.3 Data Page 17 (0x11) - General Settings
Bytes
0    1    2    3    4 - 5  6    7
0x11|0xFF|0xFF|0x??|0x7FFF|0x??|000???x
3 = Stroke Length
6 = Resistance Level
7 = FE State Bit Fields (last 4 bits)
FE State
000:0 Reserved
001:1 OFF
010:2 READY
011:3 IN_USE
100:4 FINISHED (PAUSED)
+ Lap Toggle Bit


8.5.3.1 Cycle Length = Rower = Stroke Length


8.5.3.3 Resistance Level (OPTIONAL) - defined 0-200, could use to pass drag factor?


8.5.4 Data Page 18 (0x12) - General FE Metabolic Data (Optional, Not being used)


8.6.4 Page 22 (0x16) - Specific Rower Data
Bytes
0    1    2    3    4    5 - 6  7
0x16|0xFF|0xFF|0x??|0x??|0x????|
3 = Accumulated Stroke Count
4 = Stroke Rate (Cadence) in SPM
5/6 = Power in watts - 0xFFFF = invalid
7 = Capabilities and FE State
Use to indicate accumulated stroke count is sent in byte 3











*/