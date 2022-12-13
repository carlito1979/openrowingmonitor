'use strict'
/* 
  Open Rowing Monitor, https://github.com/laberning/openrowingmonitor

  Creates a Bluetooth Low Energy (BLE) Peripheral with all the Services that are used by the
  Concept2 PM5 rowing machine.

  see: https://www.concept2.co.uk/files/pdf/us/monitors/PM5_BluetoothSmartInterfaceDefinition.pdf

  This version of the PM5 Peripheral is intended to communicate via Concept2 proprietary commands 

*/
import bleno from '@abandonware/bleno'
import { constants } from './pm5Proprietary/Pm5ConstantsProprietary.js'
import DeviceInformationService from './pm5Proprietary/DeviceInformationServiceProprietary.js'
import GapService from './pm5Proprietary/GapServiceProprietary.js'
import GattService from './pm5Proprietary/GattServiceProprietary.js'
import log from 'loglevel'
import Pm5ControlService from './pm5Proprietary/Pm5ControlServiceProprietary.js'
import Pm5RowingService from './pm5Proprietary/Pm5RowingServiceProprietary.js'
import { crEvent } from './pm5Proprietary/characteristic/ControlReceiveProprietary.js'

function createPm5PeripheralProprietary (controlCallback, options) {
  const peripheralName = constants.name
  const deviceInformationService = new DeviceInformationService()
  const gapService = new GapService()
  const gattService = new GattService()
  const controlService = new Pm5ControlService()
  const rowingService = new Pm5RowingService()
 
  crEvent.on('respond', (data) => {
    // event emitter to send a response back to the master peripheral
    controlService.response(data)
  })

  bleno.on('stateChange', (state) => {
    log.debug(`ble statechange: ${state}`) // debug code
    triggerAdvertising(state)
  })

  bleno.on('advertisingStart', (error) => {
    if (!error) {
      log.debug(`ble advertising start`) // debug code
      bleno.setServices(
        [gapService, gattService, deviceInformationService, controlService, rowingService],
        (error) => {
          if (error) log.error(error)
        })
    }
  })

  bleno.on('accept', (clientAddress) => {
    log.debug(`ble central connected: ${clientAddress}`)
    bleno.updateRssi()
  })

  bleno.on('disconnect', (clientAddress) => {
    log.debug(`ble central disconnected: ${clientAddress}`)
  })

  bleno.on('platform', (event) => {
    log.debug('platform', event)
  })
  bleno.on('addressChange', (event) => {
    log.debug('addressChange', event)
  })
  bleno.on('mtuChange', (event) => {
    log.debug('mtuChange', event)
  })
  bleno.on('advertisingStartError', (event) => {
    log.debug('advertisingStartError', event)
  })
  bleno.on('servicesSetError', (event) => {
    log.debug('servicesSetError', event)
  })
  bleno.on('rssiUpdate', (event) => {
    log.debug('rssiUpdate', event)
  })

  function destroy () {
    return new Promise((resolve) => {
      bleno.disconnect()
      bleno.removeAllListeners()
      bleno.stopAdvertising(resolve)
    })
  }

  function triggerAdvertising (eventState) {
    const activeState = eventState || bleno.state
    if (activeState === 'poweredOn') {
      bleno.startAdvertising(
        peripheralName,
        [gapService.uuid],
        (error) => {
          if (error) log.error(error)
        }
      )
    } else {
      bleno.stopAdvertising()
    }
  }

  // present current rowing metrics to C2-PM5 central
  function notifyData (type, data) {
    rowingService.notifyData(type, data)
  }

  // present current rowing status to C2-PM5 central
  function notifyStatus (status) {
    log.debug(`ble notify status: ${status}`) // debug code
  }

  return {
    triggerAdvertising,
    notifyData,
    notifyStatus,
    destroy
  }
}

export { createPm5PeripheralProprietary }
