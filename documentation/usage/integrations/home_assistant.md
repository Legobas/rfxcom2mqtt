---
headerDepth: 3
---

# Home Assistant


## MQTT discovery
The easiest way to integrate Rfxcom2MQTT with Home Assistant is by
using [MQTT discovery](https://www.home-assistant.io/integrations/mqtt#mqtt-discovery).
This allows Rfxcom2MQTT to automatically add devices to Home Assistant.

To achieve the best possible integration (including MQTT discovery):
- In your **Rfxcom2MQTT** `config.yaml` set 

```
homeassistant:
  discovery: true
```

- Enable the [MQTT integration](https://www.home-assistant.io/integrations/mqtt/) in Home Assistant


## Home Assistant device registry
When using Home Assistant MQTT discovery, Rfxcom2MQTT integrates
with the [Home Assistant device registry](https://developers.home-assistant.io/docs/en/device_registry_index.html).
This allows you to change the Home Assistant `entity_id` and `friendly_name` from the Home Assistant web interface
without having to restart Home Assistant. It also makes it possible to show which entities belong to which device.

