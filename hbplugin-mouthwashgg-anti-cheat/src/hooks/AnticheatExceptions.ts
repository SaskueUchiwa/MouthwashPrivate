import { RoleCtr } from "hbplugin-mouthwashgg-api";
import { AnticheatReason } from "../enums";

const anticheatExceptionsKey = Symbol("mouthwash:anticheat.exceptions");

export function AnticheatExceptions(exceptions: AnticheatReason[]) {
    return function<T extends RoleCtr>(constructor: T) {
        Reflect.defineMetadata(anticheatExceptionsKey, new Set(exceptions), constructor);
        
        return constructor;
    }
}

export function getAnticheatExceptions(pluginCtr: RoleCtr): Set<AnticheatReason> {
    return Reflect.getMetadata(anticheatExceptionsKey, pluginCtr);
}