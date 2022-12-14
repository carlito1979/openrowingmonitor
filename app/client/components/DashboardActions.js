'use strict'
/*
  Open Rowing Monitor, https://github.com/laberning/openrowingmonitor

  Component that renders the action buttons of the dashboard
*/

import { AppElement, html, css } from './AppElement.js'
import { customElement, state } from 'lit/decorators.js'
import { icon_undo, icon_expand, icon_compress, icon_poweroff, icon_bluetooth, icon_upload, icon_ant_on, icon_ant_off } from '../lib/icons.js'
import './AppDialog.js'

@customElement('dashboard-actions')
export class DashboardActions extends AppElement {
  static styles = css`
    button {
      outline:none;
      background-color: var(--theme-button-color);
      border: 0;
      border-radius: var(--theme-border-radius);
      color: var(--theme-font-color);
      margin: 0.2em 0;
      font-size: 60%;
      text-decoration: none;
      display: inline-flex;
      width: 3.5em;
      height: 2.5em;
      justify-content: center;
      align-items: center;
    }
    button:hover {
      filter: brightness(150%);
    }

    #fullscreen-icon {
        display: inline-flex;
    }

    #windowed-icon {
      display: none;
    }

    .icon {
      height: 1.7em;
    }

    .peripheral-mode {
      font-size: 80%;
    }

    @media (display-mode: fullscreen) {
      #fullscreen-icon {
        display: none;
      }
      #windowed-icon {
        display: inline-flex;
      }
    }
  `

  @state({ type: Object })
    dialog

  render () {
    // TEMP CODE ADDED IN TO PUT IN A BUTTON ON WEB GUI TO START A RECORDED SESSION
    return html`
    <button @click=${this.replay}>${icon_upload}</button>
    <button @click=${this.reset}>${icon_undo}</button>
    ${this.renderOptionalButtons()}
    <button @click=${this.switchPeripheralMode}>${icon_bluetooth}</button>
    <div class="peripheral-mode">${this.peripheralMode()}</div>
    ${this.dialog ? this.dialog : ''}
  `
  }

  renderOptionalButtons () {
    const buttons = []
    // changing to fullscreen mode only makes sence when the app is openend in a regular
    // webbrowser (kiosk and standalone mode are always in fullscreen view) and if the
    // browser supports this feature
    if (this.appState?.appMode === 'BROWSER' && document.documentElement.requestFullscreen) {
      buttons.push(html`
      <button @click=${this.toggleFullscreen}>
        <div id="fullscreen-icon">${icon_expand}</div>
        <div id="windowed-icon">${icon_compress}</div>
      </button>
    `)
    }
    // add a button to power down the device, if browser is running on the device in kiosk mode
    // and the shutdown feature is enabled
    // (might also make sence to enable this for all clients but then we would need visual feedback)
    if (this.appState?.appMode === 'KIOSK' && this.appState?.config?.shutdownEnabled) {
      buttons.push(html`
      <button @click=${this.shutdown}>${icon_poweroff}</button>
    `)
    }

    // strava upload button
    if (this.appState?.config?.stravaUploadEnabled) {
      buttons.push(html`
      <button @click=${this.uploadTraining}>${icon_upload}</button>
    `)
    }

    // ant server stop/start button
    if (this.appState?.config?.antServerEnabled) {
      buttons.push(html`
      <button @click=${this.toggleAntServer}>${this.antMode()}</button>
    `)
    }

    return buttons
  }

  peripheralMode () {
    const value = this.appState?.config?.peripheralMode
    if (value === 'PM5') {
      return 'C2 PM5'
    } else if (value == 'PMP') {
      return 'PM5 Prop'
    } else if (value === 'FTMSBIKE') {
      return 'FTMS Bike'
    } else if (value === 'FTMS') {
      return 'FTMS Rower'
    } else {
      return ''
    }
  }

  toggleFullscreen () {
    const fullscreenElement = document.getElementsByTagName('web-app')[0]
    if (!document.fullscreenElement) {
      fullscreenElement.requestFullscreen({ navigationUI: 'hide' })
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
  }

  // TEMP CODE ADDED IN TO PUT IN A BUTTON ON WEB GUI TO START A RECORDED SESSION
  replay () {
    this.sendEvent('triggerAction', { command: 'replayRowingSession' })
  }

  reset () {
    this.sendEvent('triggerAction', { command: 'reset' })
  }

  toggleAntServer () {
    this.sendEvent('triggerAction', { command: 'toggleAntServer' })
  }

  antMode() {
    return this.appState?.config?.antServerRunning ? icon_ant_on : icon_ant_off
  }

  switchPeripheralMode () {
    this.sendEvent('triggerAction', { command: 'switchPeripheralMode' })
  }

  uploadTraining () {
    this.dialog = html`
      <app-dialog @close=${dialogClosed}>
        <legend>${icon_upload}<br/>Upload to Strava?</legend>
        <p>Do you want to finish your workout and upload it to Strava?</p>
      </app-dialog>
    `
    function dialogClosed (event) {
      this.dialog = undefined
      if (event.detail === 'confirm') {
        this.sendEvent('triggerAction', { command: 'uploadTraining' })
      }
    }
  }

  shutdown () {
    this.dialog = html`
      <app-dialog @close=${dialogClosed}>
        <legend>${icon_poweroff}<br/>Shutdown Open Rowing Monitor?</legend>
        <p>Do you want to shutdown the device?</p>
      </app-dialog>
    `
    function dialogClosed (event) {
      this.dialog = undefined
      if (event.detail === 'confirm') {
        this.sendEvent('triggerAction', { command: 'shutdown' })
      }
    }
  }
}
