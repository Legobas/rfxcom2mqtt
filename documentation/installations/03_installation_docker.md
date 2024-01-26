---
headerDepth: 2
---

# Docker
It is possible to run Rfxcom2MQTT in a Docker container using the [Rfxcom2MQTT Docker image](https://hub.docker.com/r/sguernion/rfxcom2mqtt/).

This image support the following architectures: `amd64`, `arm/v7`.

## Creating the initial configuration
Navigate to the directory where you will store the Rfxcom2MQTT data and execute the following command:

```bash
wget https://raw.githubusercontent.com/sguernion/rfxcom2mqtt/main/config/config.yaml -P data
```

Now configure the MQTT server and adapter location as explained [here](./configuration/README.md).

## Running the container

Execute the following command, update the `--device` parameter to match the location of your adapter.

```bash
$ docker run \
   --name rfxcom2mqtt \
   --restart=unless-stopped \
   --device=/dev/serial/by-id/usb-RFXCOM_RFXtrx433_A1XR56A5-if00-port0:/dev/ttyACM0 \
   -v $(pwd)/data:/app/data \
   -e TZ=Europe/Amsterdam \
   sguernion/rfxcom2mqtt
```

**Parameters explanation:**  
* `--name rfxcom2mqtt`: Name of container
* `--restart=unless-stopped`: Automatically start on boot and restart after a crash
* `--device=/dev/serial/by-id/usb-RFXCOM_RFXtrx433_A1XR56A5-if00-port0:/dev/ttyACM0`: Location of adapter. The path before the `:` is the path on the host, the path after it is the path that is mapped to inside the container. You should always use the `/dev/serial/by-id/` path on the host.
* `-v $(pwd)/data:/app/data`: Directory where Rfxcom2MQTT stores it configuration (pwd maps to the current working directory)
* `-e TZ=Europe/Paris`: Configure the timezone

::: tip
If you run the MQTT-Server on the same host (localhost) you could use the IP
of the `docker0` bridge to establish the connection: `server: mqtt://172.17.0.1`.
:::

## Updating
To update to the latest Docker image:
```bash
docker pull sguernion/rfxcom2mqtt:latest
docker rm -f rfxcom2mqtt
# Now run the container again with the instructions above
```

## Tags
The following tags are available:
- Latest release version: `latest`
- Specific release version, e.g: `1.0.0`

## Docker Compose

Example of a Docker Compose file:

```yaml
version: '3.8'
services:
  rfxcom2mqtt:
    container_name: rfxcom2mqtt
    image: sguernion/rfxcom2mqtt
    restart: unless-stopped
    volumes:
      - ./data:/app/data
    environment:
      - TZ=Europe/Paris
    devices:
      # Make sure this matched your adapter location
      - /dev/serial/by-id/usb-RFXCOM_RFXtrx433_A1XR56A5-if00-port0:/dev/ttyACM0
```

You can also run a rootless container with Docker Compose by adding the required attributes to the `rfxcom2mqtt` service block in your `docker-compose.yml`:

```yaml
    group_add:
      - dialout
    user: 1000:1000
```
### Starting the container
To start the Docker container:
```bash
docker compose up -d rfxcom2mqtt
```

You can optionally skip `rfxcom2mqtt` and it will start all containers listed in the compose file.

### Updating
To update to the latest Docker image:
```bash
docker compose pull rfxcom2mqtt
docker compose up -d rfxcom2mqtt
```

You can optionally skip `rfxcom2mqtt` and it will pull any new images for all containers in the compose file, and then restart those that were updated.
