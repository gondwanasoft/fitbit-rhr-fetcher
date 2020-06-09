// Based partially on https://github.com/Fitbit/sdk-oauth

import * as messaging from "messaging"
import { settingsStorage } from "settings"

  // TODO 4 obfuscate for git:
const serverDir = "https://[obfuscatedServer]/[obfuscatedDirectoryPath]/"
const serverExe = '[feverObfuscated].php'
const key = "[obfuscatedKey]"

const nbrStages = 8
const csvRecords = new Array()

let serverTimeoutTimer

settingsStorage.setItem('accountStatus', 'Not logged in')
settingsStorage.setItem('status', 'Awaiting log-in')
settingsStorage.setItem('downloadUrl', '')

async function fetchData(accessToken) {
  // Returns true on success.

  const userId = await fetchProfileData(accessToken)
  if (!userId) return false

  // TODO 9 restore all data requests:
  //if (! await fetchHeartDataBlock(accessToken, "2014-01-01", "2014-01-07")) return false
  if (! await fetchHeartDataBlock(accessToken, "2019-01-01", "2019-04-30", 2)) return false
  if (! await fetchHeartDataBlock(accessToken, "2019-05-01", "2019-08-31", 3)) return false
  if (! await fetchHeartDataBlock(accessToken, "2019-09-01", "2019-12-31", 4)) return false
  if (! await fetchHeartDataBlock(accessToken, "2020-01-01", "2020-04-30", 5)) return false
  if (! await fetchHeartDataBlock(accessToken, "2020-05-01", "2020-06-30", 6)) return false

  //csvRecords.push('2010-01-01,45\n'); csvRecords.push('2010-01-02,56\n')  // for concise testing

  sendToServer(userId)
}

function fetchProfileData(accessToken) {
  // Resolves to encodedId on success, or false.
  //console.log(`fetchProfileData`)
  messaging.peerSocket.send({progress:1/nbrStages, status:`Fetching profile data...`, ok:true})
  settingsStorage.setItem('status', `Fetching profile data...`)
  return new Promise((resolve, reject) => {
    fetch(`https://api.fitbit.com/1/user/-/profile.json`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    })
    .then(function(response) {
      //console.log(`ok=${response.ok}`)
      //return response.text()
      if (response.ok)
        return response.json()
      else
        throw('profile fetch response not ok')
    })
    .then(function(data) {
      //console.log(`response=${data}`)
      let userArray = data['user']
      //console.log(`response=${JSON.stringify(userArray)}`)
      csvRecords.push(`Request time,${new Date()}\n`)
      csvRecords.push(`City,${userArray.city}\n`)
      csvRecords.push(`State,${userArray.state}\n`)
      csvRecords.push(`Country,${userArray.country}\n`)
      csvRecords.push(`Gender,${userArray.gender}\n`)
      csvRecords.push(`Birth year,${userArray.dateOfBirth.substring(0,4)}\n`)

      //console.log(`fetchProfileData() ${JSON.stringify(csvRecords)}`)

      settingsStorage.setItem('status', `Fetched profile data okay`)
      messaging.peerSocket.send({progress:2/nbrStages, status:`Fetched profile data okay`, ok:true})
      resolve(userArray.encodedId)
    })
    .catch(err => {
      console.error('fetchProfileData() error: ' + err)
      settingsStorage.setItem('status', `Failed to fetch profile data`)
      messaging.peerSocket.send({progress:2/nbrStages, status:`Failed to fetch profile data`, ok:false})
      resolve(false)
    })
  })
}

function fetchHeartDataBlockTest(accessToken, from, to, stage) {   // TODO 9 comment out for live version
  // stage: 0-based; cf. nbrStages
  //console.log(`fetchHeartDataBlock() (test)`)
  messaging.peerSocket.send({progress:stage/nbrStages, status:`Fetching data from ${from}...`, ok:true})
  return new Promise(resolve => {
    setTimeout(() => {
      messaging.peerSocket.send({progress:++stage/nbrStages, status:`Fetched data from ${from} okay`, ok:true})
      resolve(true)
    }, 2000)
  })
}

function fetchHeartDataBlock(accessToken, from, to, stage) {   // TODO 9 reinstate for live version
  //console.log(`fetchHeartDataBlock() from ${from} to ${to}`)
  settingsStorage.setItem('status', `Fetching data from ${from}...`)
  messaging.peerSocket.send({progress:stage/nbrStages, status:`Fetching data from ${from}...`, ok:true})
  return new Promise((resolve, reject) => {
    fetch(`https://api.fitbit.com/1/user/-/activities/heart/date/${from}/${to}.json`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    })
    .then(function(response) {
      //console.log(`ok=${response.ok}`)
      //return response.text()
      if (response.ok)
        return response.json()
      else
        throw('fetch from fitbit.com response not ok')
    })
    .then(function(data) {
      //console.log(`response=${data}`)
      //console.log(`response=${JSON.stringify(data['activities-heart'])}`)
      let dayArray = data['activities-heart']
      let rhr
      dayArray.forEach(dayData => {
        //console.log(`${dayData.dateTime} ${dayData.value.restingHeartRate} ${typeof(dayData.value.restingHeartRate)}`)
        rhr = dayData.value.restingHeartRate
        if (rhr === undefined) rhr = ''
        csvRecords.push(`${dayData.dateTime},${rhr}\n`)
      });
      let date = new Date(dayArray[0].dateTime)
      //console.log(`${date} ${dayArray[0].value.restingHeartRate}`)
      settingsStorage.setItem('status', `Fetched data from ${from} okay`)
      messaging.peerSocket.send({progress:++stage/nbrStages, status:`Fetched data from ${from} okay`, ok:true})
      resolve(true)
    })
    .catch(err => {
      console.error('fetchHeartDataBlock() error: ' + err)
      settingsStorage.setItem('status', `Failed to fetch data from ${from}`)
      messaging.peerSocket.send({progress:++stage/nbrStages, status:`Failed to fetched data from ${from}`, ok:false})
      resolve(false)
    })
  })
}

function sendToServer(userId) {
  messaging.peerSocket.send({progress:(nbrStages-1)/nbrStages, status:'Uploading to server...', ok:true})
  settingsStorage.setItem('status', 'Uploading to server...')
  let formData = new FormData();
  formData.append('userId', userId)
  formData.append(key, JSON.stringify(csvRecords))
  let fetchInit = {method: 'POST', mode: 'cors', body: formData}
  serverTimeoutTimer = setTimeout(onServerTimeout, 60000)

  fetch(`${serverDir}${serverExe}`, fetchInit)
  .then(function(response) {
    //return;   // reinstate to test server non-response timeout
    clearTimeout(serverTimeoutTimer)
    //console.log(`got response: ok=${response.ok} ${response.status}`);
    if (response.ok) {
      //response.text().then(text => serverResponseError(text))  // can be useful for extracting pesky php notice responses
      response.json().then(function(data) {processResponse(data)})
    } else {
      response.text().then(text => serverResponseError(text))
    }
  })
  .catch(function(err) {
    clearTimeout(serverTimeoutTimer)
    console.error(`sendToServer() fetch upload error: ${err}`);
    settingsStorage.setItem('status', `fetch upload error: ${err}`)
    messaging.peerSocket.send({progress:1, status:`Uploading to server failed`, ok:false})
  })
}

function onServerTimeout() {
  console.error('onServerTimeout()')
  settingsStorage.setItem('status', `fetch upload timeout`);
  messaging.peerSocket.send({progress:1, status:`Uploading to server timeout`, ok:false})
}

function processResponse(responseData) {
  // requestData: JSON
  // responseData: JSON

  //console.log(`processResponse(): response=${JSON.stringify(responseData)}`);

  if (responseData.ok) {
    settingsStorage.setItem('status', 'Uploaded okay');
    settingsStorage.setItem('downloadUrl', `${serverDir}feverFiles/${responseData.file}`);
    messaging.peerSocket.send({progress:1, status:'Finished!\n\nSee Settings if you want your data.', ok:true})
  } else {
    settingsStorage.setItem('status', `Upload error: ${JSON.stringify(responseData)}`);
    messaging.peerSocket.send({progress:1, status:`Upload failed`, ok:false})
  }
}

function serverResponseError(text) {
  console.error(`serverResponseError(): response not ok: text=${text}`)
  settingsStorage.setItem('status', `fetch upload response not ok: ${text}`)
  messaging.peerSocket.send({progress:1, status:`Uploading to server response not ok`, ok:false})
}

// A user changes Settings
settingsStorage.onchange = evt => {
  if (evt.key === "oauth") {
    //console.log('settingsStorage.onchange() got oauth')
    // Settings page sent us an oAuth token
    settingsStorage.setItem('accountStatus', 'Logged in')
    let data = JSON.parse(evt.newValue)
    fetchData(data.access_token)
  }
}

// Restore previously saved settings and send to the device
function restoreSettings() {
  for (let index = 0; index < settingsStorage.length; index++) {
    let key = settingsStorage.key(index)
    if (key && key === "oauth") {
      //console.log('restoreSettings() has an oauth')
      // We already have an oauth token
      settingsStorage.setItem('accountStatus', 'Logged in')
      let data = JSON.parse(settingsStorage.getItem(key))
      fetchData(data.access_token)
    }
  }
}

// Message socket opens
messaging.peerSocket.onopen = () => {
  restoreSettings()
}