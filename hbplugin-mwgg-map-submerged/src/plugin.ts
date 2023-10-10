import {
    HindenburgPlugin,
    RoomPlugin,
    Room,
    RegisterPrefab
} from "@skeldjs/hindenburg";

import { ExtendedSkeldShipStatus } from "./objects";

export interface MwggMapSubmergedPluginConfig {

}

@HindenburgPlugin("hbplugin-map-mwgg-submerged")
@RegisterPrefab(11, [ ExtendedSkeldShipStatus ])
export class MwggMapSubmergedPlugin extends RoomPlugin {
    constructor(public readonly room: Room, public config: MwggMapSubmergedPluginConfig) {
        super(room, config);
    }

    onPluginLoad() {
        this.room.shipPrefabIds.set(5, 11);
    }

    onPluginUnload() {
        this.room.shipPrefabIds.delete(5);
    }
}