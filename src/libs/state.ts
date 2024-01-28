import {Settings} from './Settings';
import {EntityState,KeyValue} from './models';
import fs from 'fs';
import objectAssignDeep from 'object-assign-deep';
import logger from './logger';

const saveInterval = 1000 * 60 * 1; // 1 minutes

class State {
    private state: {[s: string | number]: KeyValue} = {};
    private file = process.env.RFXCOM2MQTT_DATA_STATE ?? '/app/data/state.json';
    private timer?: NodeJS.Timeout= undefined;
    private config: Settings;
    private saveInterval: number;

    constructor(config: Settings) {
        this.config = config;
        this.saveInterval = 1000 * 60 * this.config.cacheState.saveInterval;
    }

    start(): void {
        this.load();

        // Save the state on every interval
        this.timer = setInterval(() => this.save(), this.saveInterval);
    }

    stop(): void {
        clearTimeout(this.timer);
        this.save();
    }

    private load(): void {
        if (fs.existsSync(this.file)) {
            try {
                this.state = JSON.parse(fs.readFileSync(this.file, 'utf8'));
                logger.debug(`Loaded state from file ${this.file}`);
            } catch (e) {
                logger.debug(`Failed to load state from file ${this.file} (corrupt file?)`);
            }
        } else {
            logger.debug(`Can't load state from file ${this.file} (doesn't exist)`);
        }
    }

    private save(): void {
        if (this.config.cacheState.enable) {
            logger.debug(`Saving state to file ${this.file}`);
            const json = JSON.stringify(this.state, null, 4);
            try {
                fs.writeFileSync(this.file, json, 'utf8');
            } catch (e: any) {
                logger.error(`Failed to write state to '${this.file}' (${e.message})`);
            }
        } else {
            logger.debug(`Not saving state`);
        }
    }

    exists(entity: EntityState): boolean {
        return this.state.hasOwnProperty(entity.id);
    }

    get(entity: EntityState): KeyValue {
        logger.debug(`get entity state : `+entity.id);
        return this.state[entity.id] || {};
    }

    set(entity: EntityState, update: KeyValue, reason?: string): KeyValue {
        logger.debug(`update entity state : `+entity.id);
        const fromState = this.state[entity.id] || {};
        const toState = objectAssignDeep({}, fromState, update);
        const newCache = {...toState};
        this.state[entity.id] = newCache;
        return toState;
    }

    remove(id: string | number): void {
        logger.debug(`remove entity state : `+id);
        delete this.state[id];
    }
}

export default State;
