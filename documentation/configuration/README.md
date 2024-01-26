---
headerDepth: 1
next: ../usage/
---

# Configuration

Rfxcom2MQTT is configured using [YAML](https://en.wikipedia.org/wiki/YAML) based `config.yaml` file.
The file have to be located in the `data` directory within your installation. The `data` directory and the `config.yaml` has to be writeable.

```yaml
# Minimal configuration.yml example
mqtt:
  server: mqtt://localhost:1883
rfxcom:
  # Could be either USB port (/dev/ttyUSB0)
  usbport: /dev/ttyUSB0

```

::: tip CONVENTION
The _dot-notation_ of a config-key like `mqtt.server` means `server` property within the `mqtt`
section. All _dot-notation_ references are absolute.
:::

## Environment variables

It is possible to override the values in `config.yaml` via environment variables. The name of the environment

In case you want to for example override:

```yaml
rfxcom:
  usbport: zigbee2mqtt
```

set `RFXCOM_USB_DEVICE` to the desired value.

Environment variables available


| Env var | properties |
|------------|----------------|
| MQTT_PASSWORD | mqtt.password |
| MQTT_USERNAME | mqtt.username |
| MQTT_SERVER | mqtt.server |
| RFXCOM_USB_DEVICE | rfxcom.usbport |
