'use strict'
/*
  Open Rowing Monitor, https://github.com/jaapvanekris/openrowingmonitor

  This keeps an array, for ForceMetrics

  Please note: The array contains flankLength + 1 values as it is in sync with the buffer of the FlyWheel
  They are arranged that *Buffer[0] is the oldest, and *Buffer[currentLength] the youngest
*/

function createCurveAligner (minimumValue) {
  let _lastCompleteCurve = []

  function push (curve) {
    // First, remove all unneccessary leading zero's
    while (curve.length > 5 && (curve[0] < minimumValue || curve[1] < minimumValue || curve[2] < minimumValue || curve[3] < minimumValue || curve[4] < minimumValue)) {
      curve.shift()
    }

    // Next, we clean up the trailing noise in the tail of the array
    while (curve.length > 5 && (curve[curve.length - 1] < minimumValue || curve[curve.length - 2] < minimumValue || curve[curve.length - 3] < minimumValue || curve[curve.length - 4] < minimumValue || curve[curve.length - 5] < minimumValue)) {
      curve.pop()
    }
    _lastCompleteCurve = Array.from(curve)
  }

  function lastCompleteCurve () {
    if (_lastCompleteCurve.length > 0) {
      return _lastCompleteCurve
    } else {
      return []
    }
  }

  function reset () {
    _lastCompleteCurve.splice(0, _lastCompleteCurve.length)
  }

  return {
    push,
    lastCompleteCurve,
    reset
  }
}

export { createCurveAligner }
