export interface KeyValue {[s: string]: any}

export class EntityState{
  id: string = "";
  type: string = "";
  subtype: string = "";
}

//  subtype: string,
//seqnbr:           seqnbr,
//cmnd:             cmnd,

export class RfxcomInfo {
    receiverTypeCode: number = 0;
    receiverType:     string = '';
    hardwareVersion:  string = '';
    firmwareVersion:  number = 0;
    firmwareType:     string = '';
    enabledProtocols: string[] = [];
}
  
export class BridgeInfo {
    coordinator: RfxcomInfo = new RfxcomInfo();
    version: string = '';
    logLevel: string = '';
}


export class DeviceEntity {
  public manufacturer: string = "Rfxcom";
  public via_device: string = 'rfxcom2mqtt_bridge';

  constructor(
    public identifiers: string[] = [],
    //public model: string = '',
    public name:  string = '',
  ) {}
  
}

export class DeviceBridge {
  public model: string = 'Bridge';
  public name:  string = 'Rfxcom2Mqtt Bridge';
  public manufacturer: string = 'Rfxcom2Mqtt';

  constructor(
    public identifiers: string[] = [],
    public hw_version: string = '',
    public sw_version:  string =''
  ) {}
  
}

export interface MqttEventListener{
    subscribeTopic(): string[];
    onMQTTMessage(data: MQTTMessage): void;
}
export interface MQTTMessage{
    topic: string,
    message: any
}
