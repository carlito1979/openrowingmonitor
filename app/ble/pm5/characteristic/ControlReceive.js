'use strict'
/*
  Open Rowing Monitor, https://github.com/laberning/openrowingmonitor

  Implementation of the ControlReceive Characteristic as defined in:
  https://www.concept2.co.uk/files/pdf/us/monitors/PM5_BluetoothSmartInterfaceDefinition.pdf
  Used to receive controls from the central
*/
import bleno from '@abandonware/bleno'
import { getFullUUID } from '../Pm5Constants.js'
import log from 'loglevel'

export default class ControlReceive extends bleno.Characteristic {
  constructor () {
    super({
      // id for ControlReceive as defined in the spec
      uuid: getFullUUID('0021'),
      value: null,
      properties: ['writeRequest', 'readRequest'] 
    })
    this._updateValueCallback = null
  }

  onSubscribe (maxValueSize, updateValueCallback) {
    log.debug(`ControlReceive - central subscribed with maxSize: ${maxValueSize}`)
    this._updateValueCallback = updateValueCallback
    return this.RESULT_SUCCESS
  }

  // Central sends a command to the Control Point
  onWriteRequest (data, offset, withoutResponse, callback) {
    log.debug('ControlReceive command: ', data)
    log.debug('ControlReceive offset: ', offset)
    log.debug('ControlReceive withoutResponse: ', withoutResponse)
    log.debug('ControlReceive callback: ', callback)
    return this.RESULT_SUCCESS
  }
}
