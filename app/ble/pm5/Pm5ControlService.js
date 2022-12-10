'use strict'
/*
  Open Rowing Monitor, https://github.com/laberning/openrowingmonitor

  The Control service can be used to send control commands to the PM5 device
  todo: not yet wired
*/
import bleno from '@abandonware/bleno'
import { getFullUUID } from './Pm5Constants.js'
import ControlTransmit from './characteristic/ControlTransmit.js'
import { ControlReceive } from './characteristic/ControlReceive.js'

export default class PM5ControlService extends bleno.PrimaryService {
  constructor () {
    const controlReceive = new ControlReceive()
    const controlTransmit = new ControlTransmit() 
    super({
      uuid: getFullUUID('0020'),
      characteristics: [ 
        controlReceive,
        controlTransmit
      ]
    })
    this.controlReceive = controlReceive
    this.controlTransmit = controlTransmit

  }

  response (messageArray) {
    this.controlTransmit.notify(messageArray)
  }

  
}
