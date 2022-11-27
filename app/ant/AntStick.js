'use string'
/*
  Open Rowing Monitor, https://github.com/laberning/openrowingmonitor

  Simple module that works out if a compatible ANT+ stick is available, and connects to it
  This code taken directly from https://github.com/ptx2/gymnasticon without modification

  Requires an ANT+ USB stick, the following models might work:
  - Garmin USB or USB2 ANT+ or an off-brand clone of it (ID 0x1008)
  - Garmin mini ANT+ (ID 0x1009)
*/

import Ant from 'gd-ant-plus';

/**
 * Create ANT+ stick.
 */
export function createAntStick() {
  let stick = new Ant.GarminStick3; // 0fcf:1009
  if (!stick.is_present()) {
    stick = new Ant.GarminStick2; // 0fcf:1008
  }
  return stick;
}

// haven't actually figured out what happens if there's no stick present at all?
