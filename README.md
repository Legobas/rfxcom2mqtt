# RFXCOM2MQTT
RFXCOM to MQTT bridge for RFXtrx433 devices

All received RFXCOM events are published to the rfxcom2mqtt/devices/\<id\> Topic.
It is up to the MQTT receiver to filter these messages or to create a register/learning/pairing mechanism.

## Todo

* Configuration
* Support all protocols

## Usage

Subscribe to topic **rfxcom2mqtt/devices** to receive incoming messages.

Example JSON message on topic "rfxcom2mqtt/devices/0x9D07":

    {
      "type":"temperaturehumidity1",
      "subtype": 12,
      "id": "0x9D07",
      "seqnbr": 206,
      "temperature": 17.5,
      "humidity": 58,
      "humidityStatus": 1,
      "batteryLevel": 9,
      "rssi": 5
    }

Publish commands to topic: **rfxcom2mqtt/commmand**

Example for Cucu Dimmer:

    {
      "type": "lighting2",
      "id": "1010101/1",
      "command": "level 15"
    }

----

Uses the [RFXCOM](https://github.com/rfxcom/node-rfxcom) Node library for the communication with the [RFXCOM](http://www.rfxcom.com) RFXtrx433 USB 433.92MHz Transceiver.

Uses the [MQTT.js](https://github.com/mqttjs/MQTT.js) library for sending and receiving MQTT messages.
