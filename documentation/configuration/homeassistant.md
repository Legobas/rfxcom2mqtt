---
headerDepth: 2
---

# Home Assistant integration

See: [Home Assistant integration guide](../usage/integrations/home_assistant.md).

```yaml
# Optional: Home Assistant integration (MQTT discovery) (default: false)
homeassistant: 
  discovery: true
```

## Advanced configuration
```yaml
homeassistant:
  # Optional: Home Assistant enable discovery (default: true)
  discovery: true
  # Optional: Home Assistant discovery topic (default: shown below)
  # Note: should be different from [MQTT base topic](../mqtt.md) to prevent errors in HA software
  discovery_topic: 'homeassistant'
  # Optional: Home Assistant device prefix
  discovery_device: 'rfxcom2mqtt'
```