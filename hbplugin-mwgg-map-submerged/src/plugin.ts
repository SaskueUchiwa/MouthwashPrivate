import {
    HindenburgPlugin,
    RoomPlugin,
    Room,
    RegisterPrefab,
    SpawnType,
    PlayerControl,
    CustomNetworkTransform
} from "@skeldjs/hindenburg";

import { SubmergedPlayerPhysics, SubmergedShipStatus } from "./objects";

export interface MwggMapSubmergedPluginConfig {

}

@HindenburgPlugin("hbplugin-map-mwgg-submerged")
@RegisterPrefab(SpawnType.Player, [ PlayerControl, SubmergedPlayerPhysics, CustomNetworkTransform ])
@RegisterPrefab(11, [ SubmergedShipStatus ])
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