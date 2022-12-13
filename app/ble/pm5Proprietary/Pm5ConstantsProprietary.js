'use strict'
/*
  Open Rowing Monitor, https://github.com/laberning/openrowingmonitor

  Some PM5 specific constants
*/
const constants = {
  serial: '433456789',
  model: 'PM5',
  name: 'PM5 433456789 Row',
  hardwareRevision: '907',
  // See https://www.concept2.com/service/monitors/pm5/firmware for available versions
  // please note: hardware versions exclude a software version, and thus might confuse the client
  firmwareRevision: '254',
  manufacturer: 'Concept2',
  ergMachineType: [0x05] // Static E/RowErg
}

const pm5Cmd = {
  // C2 Proprietary Short Get Configuration Commands
  CSAFE_PM_GET_FW_VERSION: { cid: 0x80, cidCount: 0x0, respCount: 0x10 }, /* Response Byte 0: FW Exe Version # (MSB) Byte 1: FW Exe Version # Byte 2: FW Exe Version # Byte 15: FW Exe Version # (LSB) */
  CSAFE_PM_GET_HW_VERSION: { cid: 0x81, cidCount: 0x0, respCount: 0x10 }, /* Response Byte 0: HW Version # (MSB) Byte 1: HW Version # Byte 2: HW Version # Byte 15: HW Version # (LSB) */
  CSAFE_PM_GET_HW_ADDRESS: { cid: 0x82, cidCount: 0x0, respCount: 0x4 }, /* Response Byte 0: HW address (MSB) Byte 1: HW address Byte 2: HW address Byte 3: HW address (LSB) */
  CSAFE_PM_GET_TICK_TIMEBASE: { cid: 0x83, cidCount: 0x0, respCount: 0x4 }, /* Response Byte 0: Tick timebase (Float MSB) Byte 1: Tick timebase Byte 2: Tick timebase Byte 3: Tick timebase (Float LSB) */
  CSAFE_PM_GET_HRM: { cid: 0x84, cidCount: 0x0, respCount: 0x5 }, /* Response Byte 0: Channel Status 0 – Inactive 1 - Discovery 2 – Paired If paired then: Byte 1: Device Manufacture ID Byte 2: Device Type Byte 3: Device Num (MSB) Byte 4: Device Num (LSB) Else Bytes 1 - 4: 0 */
  CSAFE_PM_GET_DATETIME: { cid: 0x85, cidCount: 0x0, respCount: 0x7 }, /* Response Byte 0: Time Hours (1 – 12) Byte 1: Time Minutes (0 – 59) Byte 2: Time Meridiem (0 – AM, 1 – PM) Byte 3: Date Month (1 – 12) Byte 4: Date Day (1 – 31) Byte 5: Date Year (MSB) Byte 6: Date Year (LSB) */
  CSAFE_PM_GET_SCREENSTATESTATUS: { cid: 0x86, cidCount: 0x0, respCount: 0x2 }, /* Response Byte 0: Screen type Byte 1: Screen value Byte 2: Screen status */
  CSAFE_PM_GET_RACE_LANE_REQUEST: { cid: 0x87, cidCount: 0x0, respCount: 0x1 }, /* Response Byte 0: Erg Physical Address */
  CSAFE_PM_GET_RACE_ENTRY_REQUEST: { cid: 0x88, cidCount: 0x0, respCount: 0x1 }, /* Response Byte 0: Erg Logical Address */
  CSAFE_PM_GET_WORKOUTTYPE: { cid: 0x89, cidCount: 0x0, respCount: 0x1 }, /* Response Byte 0: Workout type */
  CSAFE_PM_GET_DISPLAYTYPE: { cid: 0x8A, cidCount: 0x0, respCount: 0x1 }, /* Response Byte 0: Display type */
  CSAFE_PM_GET_DISPLAYUNITS: { cid: 0x8B, cidCount: 0x0, respCount: 0x1 }, /* Response Byte 0: Display units */
  CSAFE_PM_GET_LANGUAGETYPE: { cid: 0x8C, cidCount: 0x0, respCount: 0x1 }, /* Response Byte 0: Language type */
  CSAFE_PM_GET_WORKOUTSTATE: { cid: 0x8D, cidCount: 0x0, respCount: 0x1 }, /* Response Byte 0: Workout state */
  CSAFE_PM_GET_INTERVALTYPE: { cid: 0x8E, cidCount: 0x0, respCount: 0x1 }, /* Response Byte 0: Interval type */
  CSAFE_PM_GET_OPERATIONALSTATE: { cid: 0x8F, cidCount: 0x0, respCount: 0x1 }, /* Response Byte 0: Operational state */
  CSAFE_PM_GET_LOGCARDSTATE: { cid: 0x90, cidCount: 0x0, respCount: 0x1 }, /* Response Byte 0: Log card state */
  CSAFE_PM_GET_LOGCARDSTATUS: { cid: 0x91, cidCount: 0x0, respCount: 0x1 }, /* Response Byte 0: Log card status */
  CSAFE_PM_GET_POWERUPSTATE: { cid: 0x92, cidCount: 0x0, respCount: 0x1 }, /* Response Byte 0: Power-up state */
  CSAFE_PM_GET_ROWINGSTATE: { cid: 0x93, cidCount: 0x0, respCount: 0x1 }, /* Response Byte 0: Rowing state */
  CSAFE_PM_GET_SCREENCONTENT_VERSION: { cid: 0x94, cidCount: 0x0, respCount: 0x10 }, /* Response Byte 0: Screen Content Version # (MSB) Byte 1: Screen Content e Version # Byte 2: Screen Content Version # Byte 15: Screen Content Version # (LSB) */
  CSAFE_PM_GET_COMMUNICATIONSTATE: { cid: 0x95, cidCount: 0x0, respCount: 0x1 }, /* Response Byte 0: Communication state */
  CSAFE_PM_GET_RACEPARTICIPANTCOUNT: { cid: 0x96, cidCount: 0x0, respCount: 0x1 }, /* Response Byte 0: Race Participant Count */
  CSAFE_PM_GET_BATTERYLEVELPERCENT: { cid: 0x97, cidCount: 0x0, respCount: 0x1 }, /* Response Byte 0: Battery Level Percent */
  CSAFE_PM_GET_RACEMODESTATUS: { cid: 0x98, cidCount: 0x0, respCount: 0xF }, /* Response Byte 0: HW address (MSB) Byte 1: HW address Byte 2: HW address Byte 3: HW address (LSB) Byte 4: Race Operation Type Byte 5: Race State Byte 6: Race Start State Byte 7: Rowing State Byte 8: EPM Status Byte 9: Battery Level Percent PM3/PM4: Byte 10: Avg Flywheel RPM (MSB) Byte 11: Avg Flywheel RPM (LSB) PM5: Byte 10: Tach wire test status Byte 11: Tach Simulator status Byte 12: Workout State Byte 13: Workout Type Byte 14: Operational State */
  CSAFE_PM_GET_INTERNALLOGPARAMS: { cid: 0x99, cidCount: 0x0, respCount: 0x6 }, /* Response Byte 0: Log Start Address (MSB) Byte 1: Log Start Address Byte 2: Log Start Address Byte 3: Log Start Address (LSB) Byte 4: Last Log Entry Length (MSB) Byte 5: Last Log Entry Length (LSB) */
  CSAFE_PM_GET_PRODUCTCONFIGURATION: { cid: 0x9A, cidCount: 0x0, respCount: 0xA }, /* Response Byte 0: PM Base HW Revision (MSB) Byte 1: PM Base HW Revision (LSB) Byte 2: PM Base SW Revision (MSB) Byte 3: PM Base SW Revision (LSB) Byte 4: SW Build Number Byte 5: LCD Mfg ID Byte 6: Unused (0) Byte 7: Unused (0) Byte 8: Unused (0) Byte 9: Unused (0) */
  CSAFE_PM_GET_ERGSLAVEDISCOVERREQUESTSTATUS: { cid: 0x9B, cidCount: 0x0, respCount: 0x2 }, /* Response Byte 0: Status Byte 1: # of Erg slaves present */
  CSAFE_PM_GET_WIFICONFIG: { cid: 0x9C, cidCount: 0x0, respCount: 0x2 }, /* Response Byte 0: Configuration Index Byte 1: WEP Mode */
  CSAFE_PM_GET_CPUTICKRATE: { cid: 0x9D, cidCount: 0x0, respCount: 0x1 }, /* Response Byte 0: CPU/Tick Rate Enumeration */
  CSAFE_PM_GET_LOGCARDUSERCENSUS: { cid: 0x9E, cidCount: 0x0, respCount: 0x2 }, /* Response Byte 0: Number Users on Card Byte 1: Number of Current User */
  CSAFE_PM_GET_WORKOUTINTERVALCOUNT: { cid: 0x9F, cidCount: 0x0, respCount: 0x1 }, /* Response Byte 0: Workout Interval Count */
  CSAFE_PM_GET_WORKOUTDURATION: { cid: 0xE8, cidCount: 0x0, respCount: 0x5 }, /* Response Byte 0: Time/Distance duration (0: Time, 0x40: Calories, 0xC0: Watt-Min, 0x80: Distance) Byte 1: Duration (MSB) Byte 2: Duration Byte 3: Duration Byte 4: Duration (LSB) */
  CSAFE_PM_GET_WORKOTHER: { cid: 0xE9, cidCount: 0x0, respCount: 0x4 }, /* Response Byte 0: Work Other (MSB) Byte 1: Work Other Byte 2: Work Other Byte 3: Work Other (LSB) */
  CSAFE_PM_GET_EXTENDED_HRM: { cid: 0xEA, cidCount: 0x0, respCount: 0x7 }, /* Response Byte 0: HRM Channel Status Byte 1: HRM manufacturer ID Byte 2: HRM device type Byte 3: HRM device number (MSB) Byte 4: HRM device number Byte 5: HRM device number Byte 6: HRM device number (LSB) */
  CSAFE_PM_GET_DEFCALIBRATIONVERFIED: { cid: 0xEB, cidCount: 0x0, respCount: 0x1 }, /* Response Byte 0: DF Calibration Verified Status */
  CSAFE_PM_GET_FLYWHEELSPEED: { cid: 0xEC, cidCount: 0x0, respCount: 0x2 }, /* Response Byte 0: Flywheel speed, rpm (MSB) Byte 1: Flywheel speed, rpm (LSB) */
  CSAFE_PM_GET_ERGMACHINETYPE: { cid: 0xED, cidCount: 0x0, respCount: 0x1 }, /* Response Byte 0: Erg machine type */
  CSAFE_PM_GET_RACE_BEGINEND_TICKCOUNT: { cid: 0xEE, cidCount: 0x0, respCount: 0x8 }, /* Response Byte 0: Race begin tick time, (MSB) Byte 1: Race begin tick time Byte 2: Race begin tick time Byte 3: Race begin tick time (LSB) Byte 4: Race end tick time (MSB) Byte 5: Race end tick time Byte 6: Race end tick time Byte 7: Race end tick time (LSB) */
  CSAFE_PM_GET_PM5_FWUPDATESTATUS: { cid: 0xEF, cidCount: 0x0, respCount: 0x4 }, /* Response Byte 0: Update info type (MSB) Byte 1: Update info type (LSB) Byte 2: Update status (MSB) Byte 3: Update status (LSB) */
    
  // C2 Proprietary Long Get Configuration Commands					
  CSAFE_PM_GET_ERG_NUMBER: { cid: 0x50, cidCount: 0x4, respCount: 0x1 }, /* Command Byte 0: HW address1 (MSB) Byte 1: HW address Byte 2: HW address Byte 3: HW address (LSB) */ /* Response Byte 0: Erg # */
  CSAFE_PM_GET_ERGNUMBERREQUEST: { cid: 0x51, cidCount: 0x2, respCount: 0x6 }, /* Command Byte 0: Logical Erg Number Requested Byte 1: Physical Erg Number Requested */ /* Response Byte 0: Logical Erg # Byte 1: HW address1 (MSB) Byte 2: HW address Byte 3: HW address Byte 4: HW address (LSB)s Byte 5: Physical Erg # */
  CSAFE_PM_GET_USERIDSTRING: { cid: 0x52, cidCount: 0x1, respCount: 0xA }, /* Command Byte 0: User Number */ /* Response Byte 0: User ID (MSB) Byte 1: User ID Byte 2: User ID Byte 9: User ID (LSB) */
  CSAFE_PM_GET_LOCALRACEPARTICIPANT: { cid: 0x53, cidCount: 0x7, respCount: 0xB }, /* Command Byte 0: Race Type Byte 1: Race Length (MSB) Byte 2: Race Length Byte 3: Race Length Byte 4: Race Length (LSB) Byte 5: Race Participants Byte 6: Race State */ /* Response Byte 0: HW address (MSB) Byte 1: HW address Byte 2: HW address Byte 3: HW address (LSB) Byte 4: UserID String (MSB) Byte 5: UserID String Byte 6: UserID String Byte 7: UserID String Byte 8: UserID String Byte 9: UserID String (LSB) Byte 10: Machine type */
  CSAFE_PM_GET_USER_ID: { cid: 0x54, cidCount: 0x1, respCount: 0x5 }, /* Command Byte 0: User Number */ /* Response Byte 0: User Number Byte 1: User ID (MSB) Byte 2: User ID Byte 3: User ID Byte 4: User ID (LSB) */
  CSAFE_PM_GET_USER_PROFILE: { cid: 0x55, cidCount: 0x1, respCount: 0x8 }, /* Command Byte 0: User Number */ /* Response Byte 0: User Number Byte 1: User Weight (MSB) Byte 2: User Weight (LSB) Byte 3: User DOB Day Byte 4: User DOB Month Byte 5: User DOB Year (MSB) Byte 6: User DOB Year (LSB) Byte 7: User Gender */
  CSAFE_PM_GET_HRBELT_INFO: { cid: 0x56, cidCount: 0x1, respCount: 0x5 }, /* Command Byte 0: User Number */ /* Response Byte 0: User Number Byte 1: Mfg ID Byte 2: Device Type Byte 3: Belt ID (MSB) Byte 4: Belt ID (LSB) */
  CSAFE_PM_GET_EXTENDED_HRBELT_INFO: { cid: 0x57, cidCount: 0x1, respCount: 0x7 }, /* Command Byte 0: User Number */ /* Response Byte 0: User Number Byte 1: Mfg ID Byte 2: Device Type Byte 3: Belt ID (MSB) Byte 4: Belt ID Byte 5: Belt ID Byte 6: Belt ID (LSB) */
  CSAFE_PM_GET_CURRENT_LOG_STRUCTURE: { cid: 0x58, cidCount: 0x2, respCount: 0x64 }, /* Command Byte 0: Structure ID enumeration Byte 1: Split/interval number (1 – M) */ /* Response Byte 0: Structure ID enumeration Byte 1: Split/interval number Byte 2: Bytes read Byte 3: 1st data read Byte 4: 2nd data read Byte N + 2: Nth data read */

}


// PM5 uses 128bit UUIDs that are always prefixed and suffixed the same way
function getFullUUID (uuid) {
  return `ce06${uuid}43e511e4916c0800200c9a66`
}

export {
  getFullUUID,
  constants,
  pm5Cmd
} 
