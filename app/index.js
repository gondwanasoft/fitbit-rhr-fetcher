import { me as device } from "device"
import document from "document"
import * as messaging from "messaging"

let bgEl = document.getElementById('bg')
let progressEl = document.getElementById('progress')
let statusEl = document.getElementById('status')

// Message is received from companion
messaging.peerSocket.onmessage = evt => {
  statusEl.text = evt.data.status

  if (evt.data.ok)
    progressEl.x = device.screen.width * evt.data.progress
  else {
    progressEl.x = device.screen.width
    bgEl.gradient.colors.c1 = bgEl.gradient.colors.c2 = '#800000'
  }
}
