
import {Settings,read} from './Settings';
import Discovery from './Discovery';
import Mqtt from './Mqtt';
import Rfxcom, {IRfxcom,MockRfxcom} from './RfxcomBridge';
import { RfxcomInfo,BridgeInfo,MQTTMessage, MqttEventListener } from './models';
import utils from './utils';
import logger from './logger';

var cron = require('node-cron');


export default class Controller implements MqttEventListener{
    private config : Settings
    private rfxBridge : IRfxcom
    private mqttClient : Mqtt
    private discovery : Discovery
    
    private exitCallback: (code: number, restart: boolean) => void;
  
    constructor(exitCallback: (code: number, restart: boolean) => void){
        this.exitCallback = exitCallback;
        
        const file = process.env.RFXCOM2MQTT_CONFIG ?? "/app/data/config.yml";
        this.config = read(file);
        logger.setLevel(this.config.loglevel);
        logger.info("configuration : "+JSON.stringify(this.config));
        this.rfxBridge = this.config.mock ? new MockRfxcom() : new Rfxcom(this.config.rfxcom);
        this.mqttClient = new Mqtt(this.config)
        this.discovery = new Discovery( this.mqttClient, this.rfxBridge, this.config );
        this.mqttClient.addListener(this.discovery);
        this.mqttClient.addListener(this);
    }

    async start(): Promise<void> {
        logger.info('Controller Starting');
        this.discovery.start();
        try {
            await this.rfxBridge.initialise();
        } catch (error: any) {
            logger.error('Failed to start Rfxcom');
            logger.error('Exiting...');
            logger.error(error.stack);
        }

         // MQTT
        try {
            await this.mqttClient.connect();
        } catch (error: any) {
            logger.error(`MQTT failed to connect, exiting...`);
            await this.rfxBridge.stop();
            await this.exitCallback(1,false);
        }
        
        this.rfxBridge.subscribeProtocolsEvent((type: any, evt: any,deviceConf: any) => this.sendToMQTT(type,evt,deviceConf));

        const mqttClient = this.mqttClient;
        const hass = this.discovery;
        const config = this.config
        const version = utils.getRfxcom2MQTTVersion();
        // RFXCOM Status
        this.rfxBridge.onStatus(function(coordinatorInfo: RfxcomInfo) {
            let bridgeInfo = new BridgeInfo();
            bridgeInfo.coordinator = coordinatorInfo;
            bridgeInfo.version = version;
            bridgeInfo.logLevel = config.loglevel;
            mqttClient.publish(mqttClient.topics.info, JSON.stringify(bridgeInfo), (error: any) => {});
            if( config.homeassistant?.discovery ){
                hass.publishDiscoveryToMQTT( {device: false, payload: bridgeInfo }  );
            }
        });
        
        // RFXCOM Disconnect
        this.rfxBridge.onDisconnect(function(evt: any) {
            mqttClient.publish('disconnected', 'disconnected', (error: any) => { });
        });  

        this.scheduleHealthcheck()
        logger.info('Started');
    }

    async stop(restart = false): Promise<void> {
        await this.discovery.stop();
        await this.mqttClient.disconnect();
        await this.rfxBridge.stop();
        await this.exitCallback(0, restart);
    }

    scheduleHealthcheck(){
        if (this.config.healthcheck.enabled) {
            cron.schedule(this.config.healthcheck.cron, () => {
                logger.debug('Healthcheck');
                const mqttClient = this.mqttClient;
                
                let stop = this.stop;
                this.rfxBridge.getStatus(function(status: string) {
                    mqttClient.publishState(status);
                    if (status === 'offline') {
                        stop();
                    } 
                });
            });
        }
    }

   
    subscribeTopic(): string[]{
        return [this.config.mqtt.base_topic + '/command/#'];
    }
    // RFXCOM Transmit
    onMQTTMessage(data: MQTTMessage) {
        const dn = data.topic.split('/');
        if (dn[0] != this.config.mqtt.base_topic ) {
            logger.warn('Topic Error, should start with ' + this.config.mqtt.base_topic);
            return;
        }

        if (dn[1] === 'command') {
            let deviceType = dn[2];
            let entityName = dn[3];
            // Used for units and forms part of the device id
            if (dn[4] !== undefined && dn[4].length > 0) {
                entityName = entityName + '/' + dn[4];
            }
            this.rfxBridge.onCommand(deviceType, entityName, data.message);
            return;
        }

        logger.warn('Topic Error, should start with ' + this.config.mqtt.base_topic + '/command');
        return;
    }


    sendToMQTT(type: any, evt: any,deviceConf: any) {
        logger.info("receive from rfxcom : "+JSON.stringify(evt));
        // Add type to event!
        evt.type = type;
      
        let deviceId = evt.id;
        if (type === 'lighting4') {
          deviceId = evt.data;
        }

        // Define default topic entity
        let topicEntity = deviceId;
      
        // Get device config if available
        if (deviceConf instanceof Object) {
          if (deviceConf.name !== undefined) {
            topicEntity = deviceConf.name;
          }
        }
      
        const json = JSON.stringify(evt, null, 2);
        const payload = JSON.parse(json);

        if(payload.unitCode !== undefined && !this.rfxBridge.isGroup(payload)){
          topicEntity += '/' + payload.unitCode;
        }

        this.mqttClient.publish(this.mqttClient.topics.devices + '/' + topicEntity, json, (error: any) => {});
      
        if( this.config.homeassistant?.discovery ){
            this.discovery.publishDiscoveryToMQTT( {device: true, payload: payload });
        }
      };

}
