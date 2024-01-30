
var rfxcom  = require('rfxcom');
import { SettingRfxcom,SettingDevice } from './Settings';
import { RfxcomInfo } from './models';
import logger from './logger';


export interface IRfxcom{
  isGroup(payload: any): boolean;
  initialise(): Promise<void>;
  getStatus(callback: any): void;
  onStatus(callback: any): void;
  onCommand(deviceType: string, entityName: string, payload: any): void;
  onDisconnect(callback: any): void;
  subscribeProtocolsEvent(callback: any): void;
  getSubType(type: string,subType: string): void;
  stop(): void;
  sendCommand(deviceType: string ,subTypeValue: string ,command: string | undefined ,entityName: string): void;
}

export class MockRfxcom implements IRfxcom{

  private config: SettingRfxcom;

  constructor(config: SettingRfxcom){
    this.config = config
  }

  initialise(): Promise<void>{
    return new Promise((resolve, reject) => {
      logger.info('RFXCOM Mock device initialised');
          resolve();
    });
  }
  getStatus(callback: any){
    logger.info('RFXCOM Mock get status');
    callback('online');
  }
  onStatus(callback: any){
    logger.info('RFXCOM Mock on status');
    let rfxcomInfo = new RfxcomInfo()
    rfxcomInfo.receiverTypeCode = 83;
    rfxcomInfo.receiverType = 'Mock';
    rfxcomInfo.hardwareVersion = '1.2';
    rfxcomInfo.firmwareVersion = 242;
    rfxcomInfo.firmwareType= 'Ext';
    rfxcomInfo.enabledProtocols = ["LIGHTING4","LACROSSE", "AC",  "OREGON", "HOMECONFORT"];
    callback(rfxcomInfo);
  }
  onCommand(deviceType: string, entityName: string, payload: any){
    logger.info('RFXCOM Mock on command');
  }
  onDisconnect(callback: any){
    logger.info('RFXCOM Mock on disconnect');
    callback({});
  }
  subscribeProtocolsEvent(callback: any){
    logger.info('RFXCOM Mock subscribeProtocolsEvent');
    const deviceId = 'mocked_device2';
    let deviceConf =  this.config.devices.find((dev: any) => dev.id === deviceId);
    callback('lighting2', {id:deviceId,
      "seqnbr": 7,
      "subtype": 0,
      "unitCode": "1",
      "commandNumber": 0,
      "command": "Off",
      "level": 0,
      "rssi": 5,
      "type": "lighting2",
      "subTypeValue": "AC"
    }, deviceConf);
  }
  isGroup(payload: any): boolean {
    if(payload.type === 'lighting2'){
      return (payload.commandNumber === 3 || payload.commandNumber === 4);
    }
    return false;
  }
  getSubType(type: string,subType: string){
    logger.info('RFXCOM Mock get subtype');
  }
  stop(){
    logger.info('RFXCOM Mock stop');
  }

  sendCommand(deviceType: string ,subTypeValue: string ,command: string | undefined ,entityName: string){
    logger.info('RFXCOM Mock send command : '+command);
  }
}

export default class Rfxcom implements IRfxcom{
    private debug: boolean;
    private config: SettingRfxcom;
    private rfxtrx
  
    constructor(config: SettingRfxcom){
      this.debug = (config.debug) ? config.debug : false;
      this.config = config
      this.rfxtrx = new rfxcom.RfxCom(config.usbport, {debug: this.debug});
    }
  
    private getRfxcomDevices(){
      return Object.keys(rfxcom);
    }
  
    get(){
      return this.rfxtrx;
    }

    isGroup(payload: any): boolean {
      if(payload.type === 'lighting2'){
        return (payload.commandNumber === 3 || payload.commandNumber === 4);
      }
      if(payload.type === 'lighting1'){
        return (payload.commandNumber === 5 || payload.commandNumber === 6);
      }
      if(payload.type === 'lighting6'){
        return (payload.commandNumber === 2 || payload.commandNumber === 3);
      }
      return false;
    }
  
    async initialise(): Promise<void>{
      logger.info(`Connecting to RFXCOM at ${this.config.usbport}`);
      return new Promise((resolve, reject) => {
        this.rfxtrx.initialise(function(error: any) {
          if (error) {
            logger.error('Unable to initialise the RFXCOM device');
            reject('Unable to initialise the RFXCOM device');
          } else {
            logger.info('RFXCOM device initialised');
            resolve();
          }
        });
      });
    }
  
    private validRfxcomDevice(device: any){
      return (this.getRfxcomDevices()
          .find((rfxcomDevice) => device === rfxcomDevice) !== undefined);
    }
  
    private validRfxcomDeviceFunction(device: any, deviceFunction: any) {
      if (rfxcom[device] === undefined) {
        return false;
      }
    
      const deviceFunctions = Object.getOwnPropertyNames(rfxcom[device].prototype);
      return (deviceFunctions.find((rfxcomDeviceFunction) => rfxcomDeviceFunction === deviceFunction) !== undefined);
    }
  
    private enableRFXProtocols(){
      let config = this.config;
      this.rfxtrx.enableRFXProtocols(config.receive, function(evt: any) {
        logger.info('RFXCOM enableRFXProtocols : '+ config.receive);
      });
    }
    
    getStatus(callback: any){
      this.rfxtrx.getRFXStatus(function(error: any) {
        if (error) {
          logger.error('Healthcheck: RFX Status ERROR');
          callback('offline');
        } else {
          callback('online');
        }
      });
    }
    
    onStatus(callback: any){
      logger.info('RFXCOM listen status event');
      this.rfxtrx.on('status',function(evt: any) {
        const json = JSON.stringify(evt, function(key, value) {
          if (key === 'subtype' || key === 'seqnbr' || key === 'cmnd') {
            return undefined;
          }
          return value;
        }, 2);
        logger.info('RFXCOM listen status : '+json);
        if(json !== undefined){
          logger.info('RFXCOM listen status : '+json);
          callback(JSON.parse(json) as RfxcomInfo);
	}
      });
    }

    private getDeviceConfig(deviceId: string): SettingDevice | undefined{
      if (this.config.devices === undefined) {
        return;
      }
    
      return this.config.devices.find((dev: SettingDevice) => dev.id === deviceId);
    }

    onCommand(deviceType: string, entityName: string, payload: any){
      let transmitRepetitions: number| undefined;
      let subtype: string;
      let deviceFunction: string;

      if (!this.validRfxcomDevice(deviceType)) {
        logger.warn(deviceType+ ' is not a valid device');
        return;
      }

      // We will need subType from payload
      subtype = payload.subtype;
    
      deviceFunction = payload.deviceFunction;

      if (!this.validRfxcomDeviceFunction(deviceType, payload.deviceFunction)) {
        logger.warn(payload.deviceFunction+ ' is not a valid device function on '+ deviceType);
        return;
      }
      // We may also get a value from the payload to use in the device function
      const value = payload.value;
      let deviceOptions = payload.deviceOptions;

      // Get device config if available
      const deviceConf = this.config.devices.find((dev: any) => dev.friendlyName === entityName);
      if (deviceConf instanceof Object) {
        if (deviceConf.id !== undefined) {
          entityName = deviceConf.id;
        }

        if (deviceConf.type !== undefined) {
          if (!this.validRfxcomDevice(deviceConf.type)) {
            throw new Error(deviceConf.type + ' from config: not a valid device');
          }

          deviceType = deviceConf.type;
        }

        deviceOptions = deviceConf.options;

        if (deviceConf.subtype !== undefined) {
          subtype = deviceConf.subtype;
        }
        
        transmitRepetitions = deviceConf.repetitions;
        
      }

      if (subtype === undefined) {
        throw new Error('subtype not defined in payload or config');
      }

      // Instantiate the device class
      let device;
      if (deviceOptions) {
        device = new rfxcom[deviceType](this.rfxtrx.get(), payload.subtype, deviceOptions);
      } else {
        device = new rfxcom[deviceType](this.rfxtrx.get(), payload.subtype);
      }

      const repeat: number = (transmitRepetitions) ? transmitRepetitions : 1;
      for (let i: number = 0; i < repeat; i++) {
        // Execute the command with optional value
        if (value) {
          device[deviceFunction](entityName, value);
        } else {
          device[deviceFunction](entityName);
        }

        logger.debug(deviceType+" "+entityName+'['+deviceFunction+']['+value+']');
      }
    }

    onDisconnect(callback: any){
      logger.info('RFXCOM listen disconnect event');
      this.rfxtrx.on('disconnect', function(evt: any) {
        callback(evt);
        logger.info('RFXCOM Disconnected');
      });
    }

    subscribeProtocolsEvent(callback: any){
      if(this.config.receive) {
        // Subscribe to specific rfxcom events
        this.config.receive.forEach((protocol: any) => {
          logger.info('RFXCOM listen event for protocol : '+protocol);
          this.rfxtrx.on(protocol, (evt: any, packetType: string) => {
            logger.info('receive '+protocol);
            // Add type to event
            evt.type = protocol;
            evt.deviceName = rfxcom.deviceNames[packetType][evt.subtype]
            let deviceId = evt.id;
            if (evt.type === 'lighting4') {
             deviceId = evt.data;
            }
            evt.subTypeValue = this.getSubType(evt.type,evt.subtype);
            const deviceConf = this.getDeviceConfig(deviceId);
            callback(protocol, evt, deviceConf);
          });
        });
      }
    }

    getSubType(type: string,subType: string){
      let returnValue = "notfound";
      rfxcom.transmitterPacketTypes.forEach(function (packetType: string) {
        if(type === packetType){
          if (rfxcom[packetType] !== undefined) {
            rfxcom[packetType].forEach(function (subTypeName: string) {
              if(parseInt(subType) === parseInt(rfxcom[packetType][subTypeName])){
                returnValue = subTypeName;
              }
            });
          }
        }
      });

      return returnValue;
    }

    stop(){
      logger.info('Disconnecting from RFXCOM');
      this.rfxtrx.close();
    }

    sendCommand(deviceType: string ,subTypeValue: string ,command: string | undefined  ,entityName: string){
      if( command !== undefined){
        logger.debug("send rfxcom command : "+command+" for device :"+deviceType+"."+entityName);
        let subType = this.getSubType(deviceType,subTypeValue);
        let device = new rfxcom[this.capitalize(deviceType)](this.rfxtrx, subType);
        device[command](entityName);
      }
    }

    private capitalize(str: string): string {
      return str.slice(0, 1).toUpperCase() + str.slice(1);
    }

  }
