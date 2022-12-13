'use strict'
/*
  Open Rowing Monitor, https://github.com/laberning/openrowingmonitor

  Implementation of the ControlReceive Characteristic as defined in:
  https://www.concept2.co.uk/files/pdf/us/monitors/PM5_BluetoothSmartInterfaceDefinition.pdf
  Used to receive controls from the central
*/
import bleno from '@abandonware/bleno'
import { getFullUUID } from '../Pm5ConstantsProprietary.js'
import log from 'loglevel'
import EventEmitter from 'node:events'

export const crEvent = new EventEmitter()
const FLIP_BIT = 0x80

export class ControlReceive extends bleno.Characteristic {
  constructor () {
    super({
      // id for ControlReceive as defined in the spec
      uuid: getFullUUID('0021'),
      value: null,
      properties: ['write', 'read'] 
    })
    this._updateValueCallback = null
    this._bufferArray = []
    this._flip_bit = 0x81
  }

  onReadRequest (offset, callback) {
    log.debug('ControlReceive Read Request')
    callback(this.RESULT_SUCCESS, this._updateValueCallback)
  }

  // Central sends a command to the Control Point
  onWriteRequest (data, offset, withoutResponse, callback) {
    let bufferString = ""
    //log.debug('ControlReceive data length', data.length)
    //log.debug('ControlReceive command: ', data)
    //log.debug('ControlReceive offset: ', offset)
    //log.debug('ControlReceive withoutResponse: ', withoutResponse)
    //log.debug('ControlReceive callback: ', callback)
    // we'll be able to use this to start building a command buffer
    //log.debug('First Byte: ', data[0].toString(16))
    //log.debug('Last Byte: ', data[data.length-1].toString(16))
    const firstByte = data[0]
    const lastByte = data[data.length-1]
    if (firstByte == 0xF1) { // This flags the start of the command
      this._bufferArray = [] // reset array
    } 
    if (lastByte == 0xF2) { // this flags the end of the command
      this._bufferArray.push(data)
      const buffer = Buffer.concat(this._bufferArray)
      bufferString = buffer.toString('Hex')
      log.debug('Full Command: ', buffer) // debug code
      log.debug('Buffer String: ',bufferString) // debug code
      this._bufferArray = []
    } else {
      this._bufferArray.push(data)
    }

    callback(this.RESULT_SUCCESS)

    if (lastByte == 0xF2) {
      // it's possible that we should handle this work in either a separate function, or in the ControlTransmit code
      let bufferArray = []
      if (bufferString == 'f176041302010260f2') { // this is the terminate workout command
        // we want to respond with the following command
        // flip response bit -- WE SHOULD MOVE THIS TO THE START OF THE IF STATEMENT AT SOME POINT
        this._flip_bit ^= FLIP_BIT
        bufferArray.push(this._flip_bit, 0x76, 0x01, 0x13)
        bufferArray = addStartEndFlags(bufferArray.concat(calculateChecksum(bufferArray)))
        log.debug('response buffer: ', bufferArray)
        crEvent.emit('respond', bufferArray)
      }

    }

  }

}

/*
  function to calculate the checksum for the response
*/
function calculateChecksum(bufferArray) {
  var checksum = 0x0
  bufferArray.forEach(element => {
    checksum ^= element
  })
  return byteStuffing(checksum)
}

/*
  function to calculate if a byte stuffer is required
*/
function byteStuffing(byte) {
  switch(byte) {
    case 0xF0:
      return [0xF3, 0x00]
    case 0xF1:
      return [0xF3, 0x01]
    case 0xF2:
      return [0xF3, 0x02]
    case 0xF3:
      return [0xF3, 0x03]
    default:
      return [byte]
  }
}

/*
  function to add start and end flags to array
*/
function addStartEndFlags(bufferArray) {
  bufferArray.unshift(0xF1)
  bufferArray.push(0xF2)
  return bufferArray
}