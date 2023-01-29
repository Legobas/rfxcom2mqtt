# RFXCOM2MQTT

[![RFXCOM](rfxcom.png)](http://www.rfxcom.com)

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

    {"unit":"Light1","command":"on"}

the unitname can also be defined in the topic:

    rfxcom2mqtt/command/Lights/Light1

    {"command": "on"}

### Healthcheck

If healthcheck is enabled in the config, the rfxcom status will checked every minute.
In case of an error the node process will exit.
If installed in docker the container will try to restart try to reconnect to the RFXCOM device.

----

## Dependencies:

The [RFXCOM](https://github.com/rfxcom/node-rfxcom) Node library for the communication with the [RFXCOM](http://www.rfxcom.com) RFXtrx433 433.92MHz Transceiver.

The [MQTT.js](https://github.com/mqttjs/MQTT.js) library for sending and receiving MQTT messages.
