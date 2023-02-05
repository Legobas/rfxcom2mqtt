'use strict';

const mqtt = require('mqtt');
const rfxcom = require('rfxcom');
const config = require('node-config-yaml').load("/app/data/config.yml");
const cron = require('node-cron');

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
	evt.type = type;

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
			evt.title = title;
		}
		var command = deviceConf.command;
		if (command) {
			evt.command = command
		}
	} catch {
		console.log("Unknown Device: ", device);
	}

	var json = JSON.stringify(evt, null, 2)
	mqttClient.publish(topic + "/" + device, json, { qos: qos, retain: config.mqtt.retain }, (error) => {
		if (error) {
			console.error(error)
		}
	})
	if (debug) {
		console.log('MQTT out:', topic + "/" + device, json.replace(/[\n\r][ ]*/g, ''));
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
	if (debug) {
		console.log('MQTT in:', topic, " ", payload.toString())
	}

	var deviceName = "";
	var unitName = "";
	const dn = topic.split("/");
	if (dn[0] != "rfxcom2mqtt") {
		console.log("Topic Error, should start with rfxcom2mqtt");
		return;
	}
	if (dn[1] != "command") {
		console.log("Topic Error, should start with rfxcom2mqtt/command");
		return;
	}
	deviceName = dn[2];
	if (dn.length > 3 && dn[3].length > 0) {
		unitName = dn[3];
	}

	var command = payload.toString().trim().toLowerCase();

	var deviceId = "";
	var deviceType = "";
	var unitCode = "";
	// Get device from config
	try {
		var deviceConf = config.devices.find(dev => dev.name === deviceName && (dev.command ? dev.command === command : true));
		// console.log("Device:", deviceName);
		deviceId = deviceConf.id;
		deviceType = deviceConf.type
		if (unitName) {
			// console.log("UnitName:", unitName);
			var unitConf = deviceConf.units.find(unit => unit.name === unitName);
			unitCode = unitConf.unitCode
			// console.log("UnitCode:", unitCode);
			if (unitCode) {
				deviceId = deviceId + "/" + unitCode;
			}
		}
	} catch {
		console.log("Unknown Device:", deviceName, " unitCode:", unitCode);
	}

	if (deviceType) {
		const repeat = (config.rfxcom.transmit.repeat) ? config.rfxcom.transmit.repeat : 1
		for (var i = 0; i < repeat; i++) {
			if (deviceType === "lighting2") {
				const cmd = command.split(" ")
				if (cmd[0] === "group") {
					unitCode = "0";
					command = cmd[1];
				}
				// console.log("deviceId:", deviceId, "command:", command);
				// Lighting2 Command: on, off or level x
				if (command === "on") {
					lighting2.switchOn(deviceId);
				} else if (command === "off") {
					lighting2.switchOff(deviceId);
				} else {
					if (cmd[0] === "level") {
						lighting2.setLevel(deviceId, cmd[1]);
					}
				}
			}
			if (deviceType === "lighting4") {
				lighting4.sendData(deviceId);
			}
			if (deviceType === "chime1") {
				chime1.chime(deviceId);
			}
			if (debug) {
				console.log(deviceType, deviceName, deviceId, "["+command+"]");
			}
			sleep(100);
		}
	} else {
		console.log("No DeviceType, cannot transmit command to ", deviceName);
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
	if (debug) {
		if (debug) {
			console.log('MQTT out:', topic_info, json.replace(/[\n\r][ ]*/g, ''));
		}
	}
});

// RFXCOM Disconnect
rfxtrx.on("disconnect", function (evt) {
	mqttClient.publish('rfxcom2mqtt/disconnected', 'disconnected', { qos: qos, retain: true }, (error) => {
		if (error) {
			console.error(error)
		}
	})
	console.log("RFXCOM Disconnected");
});

function findDevice(device) {

}

function sleep(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

cron.schedule('* * * * *', () => {
	if (config.healthcheck) {
		if (debug) {
			console.log("Healthcheck");
		}
		rfxtrx.getRFXStatus(function (error) {
			if (error) {
				console.log("Healthcheck: RFX Status ERROR");
				process.exit();
			}
		});
	}
});
