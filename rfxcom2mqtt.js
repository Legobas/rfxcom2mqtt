'use strict';

const mqtt = require('mqtt'); 
const rfxcom = require('rfxcom');

const device = "/dev/ttyUSB0"
const topic = 'rfxcom2mqtt/devices'
const topic_will = 'rfxcom2mqtt/status'
const topic_info = 'rfxcom2mqtt/info'
const topic_command = 'rfxcom2mqtt/command'
const topic_connected = 'rfxcom2mqtt/connected'

console.log('RFXCOM2MQTT');

const will = {"topic": topic_will, "payload": "offline", "retain": "true"}
const options = {"will": will, "username": <username>, "password": <Password>)}
const mqttClient = mqtt.connect("tcp://<ip-address>:1883", options)

mqttClient.on('connect', () => {
  console.log('Connected to MQTT')
  mqttClient.subscribe([topic_command], () => {
    console.log(`Subscribing to topic '${topic_command}'`)
  })
})

mqttClient.on('message', (topic_command, payload) => {
  console.log('Send to RFXCOM: ', payload.toString())

  const obj = JSON.parse(payload);
  if (obj.type === "lighting2") {
    const cmd = obj.command.split(" ")
    if (cmd[0] === "on") {
      lighting2.switchOn(obj.id);
    } else if (cmd[0] === "off") {
      lighting2.switchOff(obj.id);
    } else if (cmd[0] === "level") {
      lighting2.setLevel(obj.id, cmd[1]);
    }
  }
  if (obj.type === "lighting4") {
    lighting4.sendData(obj.id);
  }
  if (obj.type === "chime1") {
    chime1.chime(obj.id);
  }
})

mqttClient.on('connect', () => {
  mqttClient.publish(topic_will, 'online', { qos: 0, retain: true }, (error) => {
    if (error) {
      console.error(error)
    }
  })
})

const sendToMQTT = function(type, evt) {
  var json = JSON.stringify(evt, null, 2)
  json = json.replace("{", "{\n  \"type\":\"" + type + "\",")

  var device = evt.id;
  if (type === "lighting4") {
    device = evt.data
  }

  mqttClient.publish(topic + "/" + device, json, { qos: 0, retain: false }, (error) => {
    if (error) {
      console.error(error)
    }
  })
  console.log(json);
}

var rfxtrx = new rfxcom.RfxCom(device, {debug: true});
var lighting2 = new rfxcom.Lighting2(rfxtrx, rfxcom.lighting2.AC);
var lighting4 = new rfxcom.Lighting4(rfxtrx, rfxcom.lighting4.PT2262);
var chime1 = new rfxcom.Chime1(rfxtrx, rfxcom.chime1.SELECT_PLUS);

rfxtrx.initialise(function (error) {
  if (error) {
    throw new Error("Unable to initialise the rfx device");
  } else {
    console.log("Device initialised");
  }
});

rfxtrx.on("lighting2", function (evt) {sendToMQTT("lighting2",evt)} );
rfxtrx.on("lighting4", function (evt) {sendToMQTT("lighting4",evt)} );
rfxtrx.on("temperaturehumidity1", function (evt) {sendToMQTT("temperaturehumidity1",evt)} );

function replacer(key, value) {
  if (key === 'subtype' || key === 'seqnbr' || key === 'cmnd') {
    return undefined;
  }
  return value;
}

rfxtrx.on("status", function (evt) {
  var json = JSON.stringify(evt, replacer, 2)

  mqttClient.publish(topic_info, json, { qos: 0, retain: false }, (error) => {
    if (error) {
      console.error(error)
    }
  })
  console.log(json);
});
