'use strict';

const mqtt = require('mqtt'); 
const rfxcom = require('rfxcom');
const config = require('node-config-yaml').load("/app/data/config.yml");

const topic = 'rfxcom2mqtt/devices';
const topic_will = 'rfxcom2mqtt/status';
const topic_info = 'rfxcom2mqtt/info';
const topic_command = 'rfxcom2mqtt/command';
const topic_connected = 'rfxcom2mqtt/connected';

console.log('RFXCOM2MQTT Starting...');

console.log(config);

const will = {"topic": topic_will, "payload": "offline", "retain": "true"}
const options = {"will": will}
if (config.mqtt.username) {
  options.username = config.mqtt.username;
  options.password = config.mqtt.password;
}

var port = "1883"
if (config.mqtt.port) {
  port = config.mqtt.port;
}

const mqttClient = mqtt.connect(config.mqtt.server + ':' + port, options)

mqttClient.on('connect', () => {
  console.log('Connected to MQTT')
  mqttClient.subscribe([topic_command], () => {
    console.log(`Subscribing to topic '${topic_command}'`)
  })
})

// MQTT Connect
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
  console.log("RFXCOM Receive:", json);
}

// RFXCOM Init
var rfxdebug = (config.rfxcom.debug) ? config.rfxcom.debug : false;
var rfxtrx = new rfxcom.RfxCom(config.rfxcom.usbport, {debug: rfxdebug});
// TODO: transmit protocols
// rfxcom.lighting2[evt.subtype]
var lighting2 = new rfxcom.Lighting2(rfxtrx, rfxcom.lighting2['AC']);
var lighting4 = new rfxcom.Lighting4(rfxtrx, rfxcom.lighting4.PT2262);
var chime1 = new rfxcom.Chime1(rfxtrx, rfxcom.chime1.SELECT_PLUS);

rfxtrx.initialise(function (error) {
  if (error) {
    throw new Error("Unable to initialise the RFXCOM device");
  } else {
    console.log("RFXCOM device initialised");
  }
});

// RFXCOM Transmit
mqttClient.on('message', (topic_command, payload) => {
  console.log('RFXCOM Transmit:', payload.toString())

  const message = JSON.parse(payload);

  const repeat = (config.rfxcom.transmit.repeat) ? config.rfxcom.transmit.repeat : 1
  for (var i = 0; i < repeat; i++) {
    if (message.type === "lighting2") {
      const cmd = message.command.split(" ")
      if (cmd[0] === "on") {
        lighting2.switchOn(message.id);
      } else if (cmd[0] === "off") {
        lighting2.switchOff(message.id);
      } else if (cmd[0] === "level") {
        lighting2.setLevel(message.id, cmd[1]);
      }
    }
    if (message.type === "lighting4") {
      lighting4.sendData(message.id);
    }
    if (message.type === "chime1") {
      chime1.chime(message.id);
    }
  }
})

// RFXCOM Receive
if (config.rfxcom.receive) {
  config.rfxcom.receive.forEach(function(protocol) {
    rfxtrx.on(protocol, function (evt) {sendToMQTT(protocol,evt)} );
  });
}

// RFXCOM Status
rfxtrx.on("status", function (evt) {
  var json = JSON.stringify(evt, function(key, value) {
    if (key === 'subtype' || key === 'seqnbr' || key === 'cmnd') {
      return undefined;
    }
    return value;
  }, 2);

  mqttClient.publish(topic_info, json, { qos: 0, retain: false }, (error) => {
    if (error) {
      console.error(error);
    }
  })
  console.log("RFXCOM Status:", json);
});
