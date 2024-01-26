---
headerDepth: 2
---

# MQTT Topics and Messages

This page describes which MQTT topics are used by Rfxcom2MQTT. Note that the base topic (by default `rfxcom2MQTT`) is configurable in the [Rfxcom2MQTT `config.yaml`](../configuration/README.md).

## rfxcom2MQTT/bridge/info
Contains information of the bridge.
Whenever one of the attributes in the payload changes, this is republished.
Example payload:

```json
{
  "receiverTypeCode": 83,
  "receiverType": "433.92MHz transceiver",
  "hardwareVersion": "1.2",
  "firmwareVersion": 242,
  "firmwareType": "Ext",
  "enabledProtocols": [
    "LIGHTING4",
    "LACROSSE",
    "AC",
    "OREGON",
    "HOMECONFORT"
  ],
  "transmitterPower": 10
}
```

## rfxcom2MQTT/bridge/state
Contains the state of the bridge, this message is published as retained. Payloads are:
* `online`: published when the bridge is running (on startup)
* `offline`: published right before the bridge stops

### rfxcom2mqtt/devices** to receive incoming messages.

Contains information of an device.

Example payload on topic `"rfxcom2mqtt/devices/0x5C02"`:
```
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
```

### Publish command examples (topic/payload)

```
    rfxcom2mqtt/commmand/CucuDimmer
    on

    rfxcom2mqtt/commmand/CucuDimmer
    off

    rfxcom2mqtt/commmand/CucuDimmer
    level 15

    rfxcom2mqtt/commmand/Switch1 (lighting4, payload identifies device)
    on

    rfxcom2mqtt/commmand/Switch1
    off

    rfxcom2mqtt/commmand/Lights/Light1  (lighting2, unitName identifies device)
    on

    rfxcom2mqtt/commmand/Lights/Light1
    off
```