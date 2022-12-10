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
      properties: ['write', 'read'] 
    })
    this._updateValueCallback = null
    this._bufferArray = []
  }

  onReadRequest (offset, callback) {
    log.debug('ControlReceive Read Request')
    callback(this.RESULT_SUCCESS, this._updateValueCallback)
  }

  // Central sends a command to the Control Point
  onWriteRequest (data, offset, withoutResponse, callback) {
    log.debug('ControlReceive data length', data.length)
    log.debug('ControlReceive command: ', data)
    //log.debug('ControlReceive offset: ', offset)
    //log.debug('ControlReceive withoutResponse: ', withoutResponse)
    //log.debug('ControlReceive callback: ', callback)
    // we'll be able to use this to start building a command buffer
    log.debug('First Byte: ', data[0].toString(16))
    log.debug('Last Byte: ', data[data.length-1].toString(16))
    const firstByte = data[0]
    const lastByte = data[data.length-1]
    if (firstByte == 0xF1) { // This flags the start of the command
      this._bufferArray = [] // reset array
      this._bufferArray.push(data)
    } else if (lastByte == 0xF2) { // this flags the end of the command
      this._bufferArray.push(data)
      const buffer = Buffer.concat(this._bufferArray)
      log.debug('Full Command: ', buffer)
      log.debug('String Command: ', buffer.toString('Hex'))
      this._bufferArray = []
    } else {
      this._bufferArray.push(data)
    }

    callback(this.RESULT_SUCCESS)
  }
}
