'use strict'
/*
  Open Rowing Monitor, https://github.com/laberning/openrowingmonitor

  Provides all required GATT Characteristics of the PM5
  todo: not sure if this is correct, the normal GAP service has 0x1800
*/
import bleno from '@abandonware/bleno'
import { constants, getFullUUID } from './Pm5Constants.js'
import ValueReadCharacteristic from './characteristic/ValueReadCharacteristic.js'

export default class GattService extends bleno.PrimaryService {
  constructor () {
    super({ 
      // GATT Service UUID of PM5
      uuid: getFullUUID('1801'),
      characteristics: [
        // GATT service changed
        new ValueReadCharacteristic('2A05', null),
        // GATT client config
        new ValueReadCharacteristic('2902', [0x00, 0x00])
      ]
    })
  }
}
