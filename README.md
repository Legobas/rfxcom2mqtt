# RFXCOM2MQTT
RFXCOM to MQTT bridge for RFXtrx433 devices

## Todo

* Configuration
* Support all protocols

## Usage

Publish commands to Topic: **rfxcom2mqtt/commmand**

Example for Cucu Dimmer:

    {
      "type": "lighting2",
      "id": "1010101/1",
      "command": "level 15"
    }

----

Uses the [RFXCOM](https://github.com/rfxcom/node-rfxcom) Node library for the communication with the [RFXCOM](http://www.rfxcom.com) RFXtrx433 USB 433.92MHz Transceiver.

Uses the [MQTT.js](https://github.com/mqttjs/MQTT.js) library for sending and receiving MQTT messages.
