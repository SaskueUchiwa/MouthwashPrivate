import dgram from "dgram";
import crypto from "crypto";

import {
    EventListener,
    HindenburgPlugin,
    PlayerMoveEvent,
    PlayerSendChatEvent,
    Room,
    RoomPlugin
} from "@skeldjs/hindenburg";
import { CollidersService } from "./Colliders";

@HindenburgPlugin("hbplugin-mouthwashgg-anti-cheat", "1.0.0", "last")
export class MouthwashAntiCheatPlugin extends RoomPlugin {
    collidersService: CollidersService;

    constructor(
        public readonly room: Room,
        public readonly config: any
    ) {
        super(room, config);

        this.collidersService = new CollidersService(this);
    }

    async onPluginLoad() {
        await this.collidersService.loadAllColliders();
    }

    @EventListener("player.move")
    async onMovePlayer(ev: PlayerMoveEvent<Room>) {
        console.log("Is %s in bounds? %s", ev.player, this.collidersService.isPlayerInBounds(ev.player));
    }

    @EventListener("player.chat")
    async onPlayerChat(ev: PlayerSendChatEvent<Room>) {
        if (ev.chatMessage === "/die") {
            ev.player.control?.kill("asked for it lol");
        }
    }
}