import {
    DisconnectReason,
    EventListener,
    HindenburgPlugin,
    MessageHandler,
    PlayerData,
    PlayerEnterVentEvent,
    PlayerMoveEvent,
    PlayerSendChatEvent,
    Room,
    RoomPlugin,
    RpcMessage
} from "@skeldjs/hindenburg";

import { BaseRole, MouthwashApiPlugin, RoleAlignment } from "hbplugin-mouthwashgg-api";

import { CollidersService } from "./Colliders";
import { getAnticheatExceptions } from "./hooks";
import { AnticheatReason } from "./enums";

@HindenburgPlugin("hbplugin-mouthwashgg-anti-cheat", "1.0.0", "last")
export class MouthwashAntiCheatPlugin extends RoomPlugin {
    collidersService: CollidersService;

    api!: MouthwashApiPlugin;

    constructor(
        public readonly room: Room,
        public readonly config: any
    ) {
        super(room, config);

        this.collidersService = new CollidersService(this);
    }

    async onPluginLoad() {
        await this.collidersService.loadAllColliders();

        this.api = this.room.loadedPlugins.get("hbplugin-mouthwashgg-api")! as MouthwashApiPlugin;
    }

    async banPlayer(player: PlayerData<Room>, role: BaseRole|undefined, reason: AnticheatReason) {
        const connection = this.room.connections.get(player.clientId);
        if (!connection) return;

        this.room.bannedAddresses.add(connection.remoteInfo.address);
        if (!role) {
            this.logger.info("Banned %s for reason '%s' (no role assigned)",
                player, AnticheatReason[reason]);
        } else {
            this.logger.info("Banned %s for reason '%s' (role %s, %s)",
                player, AnticheatReason[reason], role.metadata.roleName, RoleAlignment[role.metadata.alignment]);
        }
        connection.disconnect(DisconnectReason.Banned);
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
    
    @EventListener("player.entervent")
    async onEnterVent(ev: PlayerEnterVentEvent<Room>) {
        if (!ev.message) return;

        const playerRole = this.api.roleService.getPlayerRole(ev.player);
        if (!playerRole || playerRole) {
            await this.banPlayer(ev.player, playerRole, AnticheatReason.Venting);
            return;
        }
        
        const anticheatExceptions = getAnticheatExceptions(playerRole);
        if (!anticheatExceptions.has(AnticheatReason.Venting)) {
            await this.banPlayer(ev.player, playerRole, AnticheatReason.Venting);
            return;
        }
    }
}