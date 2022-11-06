'use strict';

const mqtt = require('mqtt');
const rfxcom = require('rfxcom');
const config = require('node-config-yaml').load("/app/data/config.yml");

const topic = 'rfxcom2mqtt/devices';
const topic_will = 'rfxcom2mqtt/status';
const topic_info = 'rfxcom2mqtt/info';
const topic_command = 'rfxcom2mqtt/command/#';
const topic_connected = 'rfxcom2mqtt/connected';

console.log('RFXCOM2MQTT Starting');

var debug = (config.debug) ? config.debug : false;
if (debug) {
  console.log(config);
}

const will = { "topic": topic_will, "payload": "offline", "retain": "true" }
const options = { "will": will }
if (config.mqtt.username) {
  options.username = config.mqtt.username;
  options.password = config.mqtt.password;
}

var port = "1883"
if (config.mqtt.port) {
  port = config.mqtt.port;
}

var qos = 0
if (config.mqtt.qos) {
  qos = config.mqtt.qos;
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
  mqttClient.publish(topic_will, 'online', { qos: qos, retain: config.mqtt.retain }, (error) => {
    if (error) {
      console.error(error)
    }
  })
})

const sendToMQTT = function (type, evt) {
  var json = JSON.stringify(evt, null, 2)
  json = json.slice(0, 1) + "\n  \"type\":\"" + type + "\"," + json.slice(1)

  var device = evt.id;
  if (type === "lighting4") {
    device = evt.data
  }

  // Get device name from config
  try {
    var deviceConf = config.devices.find(dev => dev.id === device);
    device = deviceConf.name;
    var title = deviceConf.title
    if (title) {
      json = json.slice(0, 1) + "\n  \"title\":\"" + title + "\"," + json.slice(1)
    }
  } catch {
    console.log("Unknown Device: ", device);
  }

  mqttClient.publish(topic + "/" + device, json, { qos: qos, retain: config.mqtt.retain }, (error) => {
    if (error) {
      console.error(error)
    }
  })
  if (debug) {
    console.log("RFXCOM Received:", json.replace(/[\n\r][ ]*/g, ''));
  }
}

// RFXCOM Init
var rfxdebug = (config.rfxcom.debug) ? config.rfxcom.debug : false;
var rfxtrx = new rfxcom.RfxCom(config.rfxcom.usbport, { debug: rfxdebug });
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
mqttClient.on('message', (topic, payload) => {
  console.log('RFXCOM Transmit:', topic, " ", payload.toString())

  const message = JSON.parse(payload);
  var deviceName = message.name;
  if (!deviceName) {
    deviceName = topic.slice(20);
  }
  var deviceId = "";
  var deviceType = "";
  var unitCode = "";
  // Get device from config
  try {
    var deviceConf = config.devices.find(dev => dev.name === deviceName && (dev.command ? dev.command === message.command : true));
    console.log("Device ", deviceName);
    console.log("DeviceConf ", deviceConf);
    deviceId = deviceConf.id;
    deviceType = deviceConf.type
    unitCode = message.unitCode
  } catch {
    console.log("Unknown Device:", deviceName);
  }

  if (deviceType) {
    const repeat = (config.rfxcom.transmit.repeat) ? config.rfxcom.transmit.repeat : 1
    for (var i = 0; i < repeat; i++) {
      if (deviceType === "lighting2") {
        const cmd = message.command.split(" ")
        var switchId = deviceId + (unitCode ? "/" + unitCode : "")
        if (cmd[0] === "on") {
          lighting2.switchOn(switchId);
        } else if (cmd[0] === "off") {
          lighting2.switchOff(switchId);
        } else if (cmd[0] === "level") {
          lighting2.setLevel(switchId, cmd[1]);
        }
        if (debug) {
          console.log("Lighting2 ", deviceName, " - ", switchId, ": ", message.command);
        }
      }
      if (deviceType === "lighting4") {
        lighting4.sendData(deviceId);
      }
      if (deviceType === "chime1") {
        chime1.chime(deviceId);
      }
      if (debug) {
        console.log("Command sent to ", deviceName, ": ", message.command);
      }
      sleep(100);
    }
  } else {
    console.log("No DeviceType, cannot send to ", deviceName);
  }
})


// RFXCOM Receive
if (config.rfxcom.receive) {
  config.rfxcom.receive.forEach(function (protocol) {
    rfxtrx.on(protocol, function (evt) { sendToMQTT(protocol, evt) });
  });
}

// RFXCOM Status
rfxtrx.on("status", function (evt) {
  var json = JSON.stringify(evt, function (key, value) {
    if (key === 'subtype' || key === 'seqnbr' || key === 'cmnd') {
      return undefined;
    }
    return value;
  }, 2);

  mqttClient.publish(topic_info, json, { qos: qos, retain: config.mqtt.retain }, (error) => {
    if (error) {
      console.error(error);
    }
  })
  console.log("RFXCOM Status:", json);
});

function findDevice(device) {

}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
