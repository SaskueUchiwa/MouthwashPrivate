import {
    HindenburgPlugin,
    RoomPlugin,
    Room,
    RegisterPrefab,
    SpawnType,
    PlayerControl,
    CustomNetworkTransform,
    EventListener,
    MeetingHudCloseEvent
} from "@skeldjs/hindenburg";

import { SubmergedPlayerPhysics, SubmergedShipStatus } from "./objects";
import { SubmergedSystemType } from "./enums";
import { SubmarineBoxCatSystem } from "./systems";

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

    @EventListener("meeting.close")
    onMeetingHudClose(ev: MeetingHudCloseEvent<Room>) {
        const boxCatSystem = this.room.shipStatus?.systems.get(SubmergedSystemType.BoxCat as number);
        if (boxCatSystem instanceof SubmarineBoxCatSystem) {
            boxCatSystem.moveCat();
        }
    }
}