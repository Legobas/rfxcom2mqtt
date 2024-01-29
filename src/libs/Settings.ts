var load  = require('node-config-yaml')
import objectAssignDeep from 'object-assign-deep';

type RecursivePartial<T> = {[P in keyof T]?: RecursivePartial<T[P]>;};

export interface Settings {
    mock: boolean;
    loglevel: 'warn' | 'debug' | 'info' | 'error',
    cacheState: {
        enable: boolean,
        saveInterval: number
    },
    healthcheck: {
        enabled: boolean,
        cron: string
    },
    homeassistant: SettingHass,
    mqtt: SettingMqtt,
    rfxcom: SettingRfxcom
}

export interface SettingMqtt{
    base_topic: string,
    include_device_information: boolean,
    retain: boolean
    qos: 0 | 1 | 2,
    version?: 3 | 4 | 5,
    username?: string,
    password?: string,
    port?: string,
    server: string,
    key?: string,
    ca?: string,
    cert?: string,
    keepalive?: number,
    client_id?: string,
    reject_unauthorized?: boolean,
}

export interface SettingHass{
    discovery: boolean,
    discovery_topic: string,
    discovery_device: string,
}

export interface SettingRfxcom{
    usbport: string,
    debug: boolean,
    transmit: {
        repeat: number,
        lighting1: string[],
        lighting2: string[],
        lighting3: string[],
        lighting4: string[],
    },
    receive: string[],
    devices: SettingDevice[]
}


export interface SettingDevice{
    id: string,
    name?: string,
    friendlyName?: string,
    type?: string,
    subtype?: string,
    units?: Units[],
    options?: string[],
    repetitions?: number
}

export interface Units{
    unitCode: string,
    name: string,
    friendlyName: string,
}

export function read(file: string): Settings {
    if (!_settingsWithDefaults) {
        loadSettingsWithDefaults(file);
    }

    return _settingsWithDefaults;
}


export function readLocalFile(file: string): Settings {
    return load.load(file) as Settings;
}

function getFileSettings(file: string): Partial<Settings> {
    return readLocalFile(file);
}

const defaults: RecursivePartial<Settings> = {
    mock: false,
    loglevel: 'info',
    healthcheck: {
        enabled: true,
        cron: '* * * * *'
    },
    cacheState: {
        enable: true,
        saveInterval: 5 // interval in minutes
    },
    homeassistant: {
        discovery: true,
        discovery_topic: 'homeassistant',
        discovery_device: 'rfxcom2mqtt',
    },
    mqtt: {
        base_topic: 'rfxcom2mqtt',
        include_device_information: false,
        qos: 0,
        retain: true,
    },
    rfxcom: {
        debug: true,
        receive: ['temperaturehumidity1','homeconfort','lighting1','lighting2','lighting3','lighting4','remote','security1'],
        devices: []
    },
   
}

let _settingsWithDefaults: Settings;
function loadSettingsWithDefaults(file: string): void {
    _settingsWithDefaults = objectAssignDeep({}, defaults, getFileSettings(file)) as Settings;
    applyEnvironmentVariables(_settingsWithDefaults);
}



function applyEnvironmentVariables(settings: Partial<Settings>): void {
    const mqttEnvVars = [
        {env: "MQTT_SERVER", props: "server"},
        {env: "MQTT_USERNAME", props: "username"},
        {env: "MQTT_PASSWORD", props: "password"},
        {env: "MQTT_CLIENT_ID", props: "client_id"}];

        

    mqttEnvVars.forEach( envEntry => {
        if (process.env[envEntry.env]) {
            if(settings.mqtt !== undefined){
                // @ts-ignore
                settings.mqtt[envEntry.props] = process.env[envEntry.env];
            }
        }
    });

    const rfxcomEnvVars = [
        {env: "RFXCOM_USB_DEVICE", props: "usbport"}];

    rfxcomEnvVars.forEach( envEntry => {
        if (process.env[envEntry.env]) {
            // @ts-ignore
            settings.rfxcom[envEntry.props] = process.env[envEntry.env];
        }
    });
    
}
