# RFXCOM2MQTT
RFXCOM to MQTT bridge for RFXtrx433 devices

All received RFXCOM events are published to the MQTT rfxcom2mqtt/devices/\<id\> topic.
It is up to the MQTT receiver to filter these messages or to have a register/learning/pairing mechanism.

## Usage

### Configuration

See example **config.yml**

###
List of available commands: 
[DeviceCommands](https://github.com/rfxcom/node-rfxcom/blob/master/DeviceCommands.md)


### Subscribe to topic **rfxcom2mqtt/devices** to receive incoming messages.

Example JSON message on topic `"rfxcom2mqtt/devices/0x5C02"`:

    {
      "title": "Bathroom Temp & Hum",
      "type":"temperaturehumidity1",
      "subtype": 13,
      "id": "0x5C03",
      "seqnbr": 12,
      "temperature": 18,
      "humidity": 74,
      "humidityStatus": 3,
      "batteryLevel": 9,
      "rssi": 6
    }

### Publish command examples

topic:

    rfxcom2mqtt/commmand/CucuDimmer

json examples:

    {"command": "on"}
    {"command": "level 15"}
    {"command": "off"}

topic: 

    rfxcom2mqtt/commmand/Switch1
json examples (lighting4, command identifies device id):

    {"command": "on"}
    {"command": "off"}

topic: 

    rfxcom2mqtt/commmand/Lights
json examples (lighting2, unitCode identifies device):

    {"unitCode":"2", "command": "on"}
    {"unitCode":"2", "command": "off"}
    {"unitCode":"3", "command": "on"}
    {"unitCode":"3", "command": "off"}

----

## Dependencies:

The [RFXCOM](https://github.com/rfxcom/node-rfxcom) Node library for the communication with the [RFXCOM](http://www.rfxcom.com) RFXtrx433 433.92MHz Transceiver.

The [MQTT.js](https://github.com/mqttjs/MQTT.js) library for sending and receiving MQTT messages.
