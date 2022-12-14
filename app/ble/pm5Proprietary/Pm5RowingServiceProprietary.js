'use strict'
/*
  Open Rowing Monitor, https://github.com/laberning/openrowingmonitor

  This seems to be the central service to get information about the workout
  This Primary Service provides a lot of stuff that we most certainly do not need to simulate a
  simple PM5 service.

  todo: figure out to which services some common applications subscribe and then just implement those
  // fluid simulation uses GeneralStatus STROKESTATE_DRIVING
  // cloud simulation uses MULTIPLEXER, AdditionalStatus -> currentPace
  // EXR: subscribes to: 'general status', 'additional status', 'additional status 2', 'additional stroke data'
  Might implement:
  * GeneralStatus
  * AdditionalStatus
  * AdditionalStatus2
  * (StrokeData)
  * AdditionalStrokeData
  * and of course the multiplexer
*/
import bleno from '@abandonware/bleno'
import { getFullUUID } from './Pm5ConstantsProprietary.js'
import ValueReadCharacteristic from './characteristic/ValueReadCharacteristicProprietary.js'

import GeneralStatus from './characteristic/GeneralStatus.js'
import AdditionalStatus1 from './characteristic/AdditionalStatus1.js'
import AdditionalStatus2 from './characteristic/AdditionalStatus2.js'
import SampleRate from './characteristic/SampleRate.js'
import StrokeData from './characteristic/StrokeData.js'
import AdditionalStrokeData from './characteristic/AdditionalStrokeData.js'
import IntervalData from './characteristic/IntervalData.js'
import AdditionalIntervalData from './characteristic/AdditionalIntervalData.js'
import SummaryData from './characteristic/SummaryData.js'
import AdditionalSummaryData from './characteristic/AdditionalSummaryData.js'
import ForceCurveData from './characteristic/ForceCurveData.js'

import log from 'loglevel'

export default class PM5RowingService extends bleno.PrimaryService {
  constructor () {
    const generalStatus = new GeneralStatus()
    const additionalStatus1 = new AdditionalStatus1()
    const additionalStatus2 = new AdditionalStatus2()
    const sampleRate = new SampleRate()
    const strokeData = new StrokeData()
    const additionalStrokeData = new AdditionalStrokeData()
    const intervalData = new IntervalData()
    const additionalIntervalData = new AdditionalIntervalData()
    const summaryData = new SummaryData()
    const additionalSummaryData = new AdditionalSummaryData()
    const forceCurveData = new ForceCurveData()

    super({
      uuid: getFullUUID('0030'),
      characteristics: [
        // C2 rowing general status
        generalStatus,
        // C2 rowing additional status 1
        additionalStatus1,
        // C2 rowing additional status 2
        additionalStatus2,
        // C2 sample rate
        sampleRate,
        // C2 rowing stroke data
        strokeData,
        // C2 rowing additional stroke data
        additionalStrokeData,
        // C2 rowing split/interval data
        intervalData,
        // C2 rowing additional split/interval data
        additionalIntervalData,
        // C2 rowing end of workout summary data
        summaryData,
        // C2 rowing end of workout additional summary data
        additionalSummaryData,
        // C2 rowing heart rate belt information
        new ValueReadCharacteristic(getFullUUID('003B'), 'heart rate belt information', 'heart rate belt information'),
        // C2 force curve data
        forceCurveData
      ] 
    })
    this.generalStatus = generalStatus,
    this.additionalStatus1 = additionalStatus1,
    this.additionalStatus2 = additionalStatus2,
    this.sampleRate = sampleRate,
    this.strokeData = strokeData,
    this.additionalStrokeData = additionalStrokeData,
    this.intervalData = intervalData,
    this.additionalIntervalData = additionalIntervalData,
    this.summaryData = summaryData,
    this.additionalSummaryData = additionalSummaryData,
    this.forceCurveData = forceCurveData
  }

  notifyData (type, data) {
    if (type === 'strokeFinished' || type === 'metricsUpdate') {
      this.generalStatus.notify(data)
      this.additionalStatus1.notify(data)
      this.additionalStatus2.notify(data)
      this.strokeData.notify(data)
      this.additionalStrokeData.notify(data)
      this.intervalData.notify(data)
      this.additionalIntervalData.notify(data)
      this.forceCurveData.notify(data)
    } else if (type === 'strokeStateChanged') {
      // the stroke state is delivered via the GeneralStatus Characteristic, so we only need to notify that one
      this.generalStatus.notify(data)
    }

/*
    if (type ==='strokeFinished' || type === 'strokeStateChange')  {
      
      log.debug('PM5 Notify RS type: ', type) // debug code
      log.debug('PM5 Notify RS data: ', data) // debug code
      
    }
*/

  }
}
