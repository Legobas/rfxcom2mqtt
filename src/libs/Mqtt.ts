
import * as mqtt from 'mqtt';
import {Settings, SettingMqtt} from './Settings';
import { QoS, IClientOptions }  from 'mqtt';
import { MqttEventListener,MQTTMessage }  from './models';
import fs from 'fs';
import logger from './logger';


interface MQTTOptions {qos?: QoS, retain?: boolean}

class Topic{
    base: string
    will: string
    devices: string
    info: string

    constructor(baseTopic: string) {
        this.base = baseTopic;
        this.devices = 'devices';
        this.will = 'bridge/status';
        this.info = 'bridge/info';
    }
}

export default class Mqtt{
    private defaultOptions: any;
    private client?: mqtt.MqttClient;
    private mqttSettings: SettingMqtt;
    public topics: Topic;
    private listeners: MqttEventListener[] = [];
  
    constructor(config: Settings) {
        this.mqttSettings = config.mqtt;
        this.topics = new Topic(config.mqtt.base_topic);
    }

    addListener(listener: MqttEventListener){
      this.listeners.push(listener);
    }

    async connect(): Promise<void> {
     
      let port = '1883';
      if (this.mqttSettings.port) {
        port = this.mqttSettings.port;
      }
  
      let qos = 0 as QoS;
      if (this.mqttSettings.qos) {
        qos = this.mqttSettings.qos as QoS;
      }

      this.defaultOptions = {qos: qos, retain: this.mqttSettings.retain }
      logger.info(`Connecting to MQTT server at ${this.mqttSettings.server}`);
      const will = {'topic': this.topics.base + '/'+ this.topics.will, 'payload': 'offline', 'qos': 1 as QoS,'retain': true};
      const options : IClientOptions = {'username':undefined, 'password':undefined, 'will': will};
      if (this.mqttSettings.username) {
        options.username = this.mqttSettings.username;
        options.password = this.mqttSettings.password;
      } else {
        logger.debug(`Using MQTT anonymous login`);
      }

      if (this.mqttSettings.version) {
        options.protocolVersion = this.mqttSettings.version;
      }

      if (this.mqttSettings.keepalive) {
        logger.debug(`Using MQTT keepalive: ${this.mqttSettings.keepalive}`);
          options.keepalive = this.mqttSettings.keepalive;
      }

      if (this.mqttSettings.ca) {
        logger.debug(`MQTT SSL/TLS: Path to CA certificate = ${this.mqttSettings.ca}`);
          options.ca = fs.readFileSync(this.mqttSettings.ca);
      }

      if (this.mqttSettings.key && this.mqttSettings.cert) {
        logger.debug(`MQTT SSL/TLS: Path to client key = ${this.mqttSettings.key}`);
        logger.debug(`MQTT SSL/TLS: Path to client certificate = ${this.mqttSettings.cert}`);
          options.key = fs.readFileSync(this.mqttSettings.key);
          options.cert = fs.readFileSync(this.mqttSettings.cert);
      }
  
      if (this.mqttSettings.client_id) {
        logger.debug(`Using MQTT client ID: '${this.mqttSettings.client_id}'`);
        options.clientId = this.mqttSettings.client_id;
      }

      return new Promise((resolve, reject) => {
        this.client = mqtt.connect(this.mqttSettings.server + ':' + port, options);
  
        // MQTT Connect
        this.onConnect(async () => {
          logger.info('Connected to MQTT');
          this.listeners.forEach( listener => {
            this.subscribe(listener.subscribeTopic());
          });
          this.publishState('online');
          this.onMessage();
          resolve();
        });

        this.client.on('error', (err: any) => {
          logger.error(err);
          reject(err);
        });

      });
    }
  
    private onMessage(): void {
      this.client?.on('message', (topic: string, message: any) => {
        logger.debug(`Received MQTT message on '${topic}' with data '${message.toString()}'`);
        this.listeners.forEach( listener => {
          if(listener.subscribeTopic().find(e => topic.includes(e.replace('#','')))){
            listener.onMQTTMessage({topic: topic,message: message.toString()} as MQTTMessage)
          }
        });
      });
    }
  
    private onConnect(callback: any): void {
      this.client?.on('connect', callback);
    }
  
    private subscribe(topics: any): void {
      this.client?.subscribe(topics, () => {
        logger.info(`Subscribing to topics '${topics}'`);
      });
    }
  
    publish(topic: string, playload: any, callback: any,options: MQTTOptions={},base=this.mqttSettings.base_topic): void {
      const actualOptions: mqtt.IClientPublishOptions = {...this.defaultOptions, ...options};
      topic = `${base}/${topic}`;
      logger.debug("MQTT publish: topic "+topic +", payload '"+playload+"'");
      this.client?.publish(topic, playload, actualOptions, (error: any) => {
        if (error) {
          logger.error(error);
        }
        callback(error)
      });
    }

    publishState(state :string) {
      this.publish(this.topics.will, state,(error: any) => {}, {retain: true, qos: 0});
    }
  
    isConnected(): boolean {
      return this.client !== undefined && !this.client?.reconnecting;
    }

    disconnect(){
      this.publishState('offline');
      logger.info('Disconnecting from MQTT server');
      this.client?.end();
    }
  
  }