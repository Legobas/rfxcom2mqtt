'use strict';

var rfxcom  = require('rfxcom');
import {IRfxcom} from './RfxcomBridge';
import {Settings, SettingHass} from './Settings';
import Mqtt from './Mqtt';
import { DeviceEntity, DeviceBridge,BridgeInfo,MQTTMessage,MqttEventListener } from './models';
import utils from './utils';
import State from './state';
import logger from './logger';

interface DiscoveryEntry{}

export class AbstractDiscovery {

  protected mqtt: Mqtt;
  protected rfxtrx: IRfxcom;
  protected config : SettingHass;
  protected topicWill: string;
  protected topicDevice: string;
  protected baseTopic: string;
  protected discoveryOrigin: {name: string, sw: string, url: string};
  
  constructor(mqtt: Mqtt, rfxtrx: IRfxcom, config : Settings){
    this.mqtt = mqtt;
    this.rfxtrx = rfxtrx;
    this.config = config.homeassistant;
    this.topicWill =  mqtt.topics.base + '/'+ mqtt.topics.will;
    this.topicDevice =  mqtt.topics.base + '/'+ mqtt.topics.devices;
    this.baseTopic =  mqtt.topics.base;
    this.discoveryOrigin = {name: 'Rfxcom2MQTT', sw: '', url: 'https://sguernion.github.io/rfxcom2mqtt/'};
    
  }

  async start(){
    this.discoveryOrigin.sw = utils.getRfxcom2MQTTVersion();
  }

  async stop(){
  }

  publishDiscovery(topic : any, payload: any) {
    this.mqtt.publish(topic, payload,  (error: any) => {},{retain: true, qos: 1},this.config.discovery_topic);
  }

}

export default class Discovery implements MqttEventListener{

  protected baseTopic: string;
  homeassistant: HomeassistantDiscovery;
  bridge: BridgeDiscovery;

  constructor(mqtt: Mqtt, rfxtrx: IRfxcom, config : Settings){
    this.baseTopic =  mqtt.topics.base;
    this.homeassistant = new HomeassistantDiscovery(mqtt, rfxtrx, config);
    this.bridge =  new BridgeDiscovery(mqtt, rfxtrx, config);
  }

  async start(){
    this.homeassistant.start();
    this.bridge.start();
  }

  async stop(){
    this.homeassistant.stop();
    this.bridge.stop();
  }

  subscribeTopic(): string[]{
    return [this.baseTopic + '/cmd/#',this.baseTopic + '/bridge/request/#'];
  }

  onMQTTMessage(data: MQTTMessage){
    if(data.topic.includes(this.baseTopic + '/cmd/')){
      this.homeassistant.onMQTTMessage(data);
    }else{
      this.bridge.onMQTTMessage(data);
    }
  }

  publishDiscoveryToMQTT(message : { device:boolean, payload: any }) {
    if(message.device){
      this.homeassistant.publishDiscoveryToMQTT(message.payload);
    }else{
      this.bridge.publishDiscoveryToMQTT(message.payload);
    }
  }
}


export class HomeassistantDiscovery extends AbstractDiscovery{

  protected state: State;

  constructor(mqtt: Mqtt, rfxtrx: IRfxcom, config : Settings){
    super(mqtt, rfxtrx, config);
    this.state = new State(config);
  }

  async start(){
    super.start();
    this.state.start();
  }

  async stop(){
    super.stop();
    this.state.stop();
  }

  onMQTTMessage(data: MQTTMessage){
    const value = data.message.toString('utf8');
    logger.info(`Mqtt cmd from discovery :${data.topic} ${value}`);
    const dn = data.topic.split('/');
    let deviceType = dn[2];
    let id = dn[4];
    let subTypeValue = dn[3];
    let entityName = id;
    let entityTopic = id;
    let unitCode = 1;

    //TODO check data
    
    // Used for units and forms part of the device id
    if (dn[5] !== undefined && dn[5] !== 'set' && dn[5].length > 0) {
      unitCode = parseInt(dn[5]);
      entityTopic += '/' + unitCode;
      entityName += '_' + unitCode;
    }

    logger.debug(`update ${deviceType}.${entityName} with value ${value}`);
    
    // get from save state
    let entityState = this.state.get({id: entityName,type:deviceType,subtype:data.message.subtype})
    this.updateEntityStateFromValue(entityState,value);
    this.rfxtrx.sendCommand(deviceType,subTypeValue,entityState.rfxFunction,id+"/"+unitCode);
    this.mqtt.publish(this.mqtt.topics.devices + '/' + entityTopic, JSON.stringify(entityState),  (error: any) => {},{retain: true, qos: 1});
  }

  updateEntityStateFromValue(entityState: any,value: string){
    if( entityState.type === 'lighting1' || entityState.type === 'lighting2' || entityState.type === 'lighting3' 
        || entityState.type === 'lighting5' || entityState.type === 'lighting6') {
      if (value === "On" || value === "Group On") {
        //TODO load value from rfxcom commands
        entityState.commandNumber = (value === "Group On")?4:1;
        entityState.rfxFunction = 'switchOn';
      } else {
        entityState.commandNumber = (value === "Group On")?3:0;
        entityState.rfxFunction = 'switchOff';
      }
      entityState.command = value;
    }

     //TODO get command for other deviceType
  }



  publishDiscoveryToMQTT(payload : any) {
    const devicePrefix = this.config.discovery_device;
    let id = payload.id;
    let deviceId = payload.subTypeValue+"_"+id.replace("0x","");
    let entityId = payload.subTypeValue+"_"+id.replace("0x","");
    let entityTopic = payload.id;
    let entityName = payload.id;
    
    if(payload.unitCode !== undefined  && !this.rfxtrx.isGroup(payload)){
      entityId += '_' + payload.unitCode;
      entityTopic += '/'+ payload.unitCode;
      entityName += '_'+payload.unitCode;
    }

    this.state.set({id: entityName,type:payload.type,subtype:payload.subtype},payload,"event");

    const deviceJson = new DeviceEntity([devicePrefix+'_'+deviceId],deviceId);

    if( payload.rssi !== undefined ){
      const json = {
        availability:[{topic: this.topicWill }],
        device: deviceJson,
        enabled_by_default: false,
        entity_category: "diagnostic",
        icon: "mdi:signal",
        json_attributes_topic: this.topicDevice + '/' + entityTopic,
        name: deviceId+" Linkquality",
        object_id: deviceId+'_linkquality',
        origin: this.discoveryOrigin,
        state_class: "measurement",
        state_topic: this.topicDevice + '/' + entityTopic,
        unique_id: deviceId +'_linkquality_' + devicePrefix,
        unit_of_measurement:"dBm",
        value_template: "{{ value_json.rssi }}"
      };
      this.publishDiscovery('sensor/' + deviceId +'/linkquality/config',JSON.stringify(json));
    }
    if( payload.type === 'lighting1' || payload.type === 'lighting2' || payload.type === 'lighting3'
        || payload.type === 'lighting5' || payload.type === 'lighting6' ){
      let state_off="Off";
      let state_on="On";
      let entityName = entityId;
      if(this.rfxtrx.isGroup(payload)){
         state_off="Group off";
         state_on="Group On";
         entityName+="_group"
      }

      const json = {
        availability:[{topic: this.topicWill }],
        device: deviceJson,
        enabled_by_default:true,
        payload_off: state_off,
        payload_on: state_on,
        json_attributes_topic: this.topicDevice + '/' + entityTopic,
        command_topic: this.mqtt.topics.base + '/cmd/' + payload.type + '/'+ payload.subtype + '/' + entityTopic + '/set',
        name: entityName,
        object_id: entityId,
        origin: this.discoveryOrigin,
        state_off: state_off,
        state_on: state_on,
        state_topic: this.topicDevice + '/' + entityTopic,
        unique_id: entityId+'_'+devicePrefix,
        value_template:"{{ value_json.command }}"
      };
      this.publishDiscovery('switch/' + entityId +'/config',JSON.stringify(json));
    }
  
  }
}


export class BridgeDiscovery extends AbstractDiscovery{

  constructor(mqtt: Mqtt, rfxtrx: IRfxcom, config : Settings){
    super(mqtt, rfxtrx, config);
  }

  async start(){
    super.start();
  }

  async stop(){
   super.stop();
  }

  onMQTTMessage(data: MQTTMessage){
    if(data.topic === this.baseTopic + '/bridge/request/log_level'){
      const payload = JSON.parse(data.message);
      logger.setLevel(payload.log_level);
      logger.info("update log level to : "+payload.log_level);
    }
  }

  publishDiscoveryToMQTT(bridgeInfo : BridgeInfo) {
      
      const deviceJson = new DeviceBridge(
        ['rfxcom2mqtt_bridge'],
        `${bridgeInfo.coordinator.hardwareVersion} ${bridgeInfo.coordinator.firmwareVersion}`,
        this.discoveryOrigin.sw,
      );
      const json = {
        availability:[{topic: this.topicWill }],
        availability_mode: 'all',
        device: deviceJson,
        entity_category: 'diagnostic',
        icon: 'mdi:chip',
        name: 'Coordinator Version',
        object_id: 'bridge_rfxcom2mqtt_coordinator_version',
        origin: this.discoveryOrigin,
        state_topic: this.mqtt.topics.base +'/'+this.mqtt.topics.info,
        unique_id: 'bridge_rfxcom2mqtt_coordinator_version',
        value_template:"{{ value_json.coordinator.firmwareVersion }}"
      };
      this.publishDiscovery('sensor/bridge_rfxcom2mqtt_coordinator_version/version/config',JSON.stringify(json));

      const jsonVersion = {
        availability:[{topic: this.topicWill }],
        availability_mode: 'all',
        device: deviceJson,
        entity_category: 'diagnostic',
        name: 'Version',
        object_id: 'bridge_rfxcom2mqtt_version',
        origin: this.discoveryOrigin,
        state_topic: this.mqtt.topics.base +'/'+this.mqtt.topics.info,
        unique_id: 'bridge_rfxcom2mqtt_version',
        value_template:"{{ value_json.version }}"
      };
      this.publishDiscovery('sensor/bridge_rfxcom2mqtt_version/version/config',JSON.stringify(jsonVersion));


      const jsonState = {
        availability:[{topic: this.topicWill }],
        availability_mode: 'all',
        device: deviceJson,
        device_class: 'connectivity',
        entity_category: 'diagnostic',
        name: 'Connection State',
        payload_on: 'online',
        payload_off: 'offline',
        object_id: 'bridge_rfxcom2mqtt_connection_state',
        origin: this.discoveryOrigin,
        state_topic: this.mqtt.topics.base +'/'+this.mqtt.topics.will,
        unique_id: 'bridge_rfxcom2mqtt_connection_state',
        value_template:"{{ value }}"
      };
      this.publishDiscovery('binary_sensor/bridge_rfxcom2mqtt_version/connection_state/config',JSON.stringify(jsonState));


      const jsonLoggerLevel = {
        availability:[{topic: this.topicWill }],
        availability_mode: 'all',
        device: deviceJson,
        entity_category: 'config',
        name: 'Log level',
        object_id: 'bridge_rfxcom2mqtt_log_level',
        origin: this.discoveryOrigin,
        state_topic: this.mqtt.topics.base +'/'+this.mqtt.topics.info,
        command_topic: this.mqtt.topics.base + '/bridge/request/log_level',
        command_template: '{"log_level": "{{ value }}" }',
        options: ['info', 'warn', 'error', 'debug'],
        unique_id: 'bridge_rfxcom2mqtt_log_level',
        value_template:"{{ value_json.logLevel | lower }}"
      };
      this.publishDiscovery('select/bridge_rfxcom2mqtt_log_level/log_level/config',JSON.stringify(jsonLoggerLevel));
  }

}
