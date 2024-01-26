---
headerDepth: 2
---

# Debug

In case Rfxcom2MQTT isn't working as expected the following tips can help you in finding the problem.

## Enabling logging

### Rfxcom2MQTT debug logging
To enable debug logging for Rfxcom2MQTT add the following in your `config.yaml`

```yaml
logLevel: 'debug'
```

### Rfxcom debug logging
To enable debug logging for Rfxcom add the following in your `config.yaml`

```yaml
rfxcom:
  debug: true
```
