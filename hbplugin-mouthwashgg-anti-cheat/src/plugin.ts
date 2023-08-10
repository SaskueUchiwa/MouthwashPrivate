import {
    BaseRpcMessage,
    Connection,
    CustomNetworkTransform,
    DataMessage,
    DespawnMessage,
    DisconnectReason,
    EventListener,
    GameState,
    HazelReader,
    HindenburgPlugin,
    MessageHandler,
    MessageHandlerCallback,
    PacketContext,
    PlayerData,
    PlayerEnterVentEvent,
    PlayerExitVentEvent,
    PlayerMoveEvent,
    PlayerMurderEvent,
    PlayerSendChatEvent,
    PlayerSetColorEvent,
    PlayerSetImpostorsEvent,
    PlayerSetNameEvent,
    PlayerSetStartCounterEvent,
    PlayerSnapToEvent,
    PlayerStartMeetingEvent,
    PlayerSyncSettingsEvent,
    Room,
    RoomPlugin,
    RpcMessage,
    SpawnMessage,
    SpawnType,
    SyncSettingsMessage
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

        this.api = this.room.loadedPlugins.get("hbplugin-mouthwashgg-api")?.pluginInstance as MouthwashApiPlugin;
    }

    async banPlayer(player: PlayerData<Room>|Connection, role: BaseRole|undefined, reason: AnticheatReason) {
        const connection = player instanceof Connection ? player : this.room.connections.get(player.clientId);
        if (!connection) return;

        this.room.bannedAddresses.add(connection.remoteInfo.address);
        if (!role) {
            this.logger.info("Banned %s for reason '%s'",
                player, reason);
        } else {
            this.logger.info("Banned %s for reason '%s' (role %s, %s)",
                player, reason, role.metadata.roleName, RoleAlignment[role.metadata.alignment]);
        }
        connection.disconnect(DisconnectReason.Banned);
    }

    @EventListener("player.move")
    async onMovePlayer(ev: PlayerMoveEvent<Room>) {
        console.log("Is %s in bounds? %s", ev.player, this.collidersService.isPlayerInBounds(ev.player));
    }

    @MessageHandler(RpcMessage, { override: true })
    async onRpcMessage(message: RpcMessage, ctx: PacketContext, originalListeners: MessageHandlerCallback<RpcMessage>[]) {
        if (this.room.host && this.room.host.clientId === ctx.sender?.clientId && !this.room["finishedActingHostTransactionRoutine"] && message.data instanceof SyncSettingsMessage) {
            this.logger.info("Got initial settings, acting host handshake complete");
            this.room["finishedActingHostTransactionRoutine"] = true;
            this.room.settings.patch(message.data.settings);
            return;
        }

        const component = this.room.netobjects.get(message.netid);

        if (component) {
            if (ctx.sender !== undefined) {
                if (component.ownerId !== ctx.sender.clientId) {
                    await this.banPlayer(ctx.sender, undefined, AnticheatReason.UnownedComponent);
                    return;
                }
            }

            try {
                await component.HandleRpc(message.data);
            } catch (e) {
                this.logger.error("Could not process remote procedure call from client %s (net id %s, %s): %s",
                    ctx.sender, component.netId, SpawnType[component.spawnType] || "Unknown", e);
            }
        } else {
            this.logger.warn("Got remote procedure call for non-existent component: net id %s", message.netid);
        }
    }

    @MessageHandler(SpawnMessage, { override: true })
    async onSpawnMessage(message: SpawnMessage, ctx: PacketContext, originalListeners: MessageHandlerCallback<SpawnMessage>[]) {
        if (!ctx.sender) return;
        await this.banPlayer(ctx.sender, undefined, AnticheatReason.IllegalSpawn);
    }

    @MessageHandler(DespawnMessage, { override: true })
    async onDespawnMessage(message: DespawnMessage, ctx: PacketContext, originalListeners: MessageHandlerCallback<DespawnMessage>[]) {
        if (!ctx.sender) return;
        await this.banPlayer(ctx.sender, undefined, AnticheatReason.IllegalDespawn);
    }

    @MessageHandler(DataMessage, { override: true })
    async onDataMessage(message: DataMessage, ctx: PacketContext, originalListeners: MessageHandlerCallback<DataMessage>[]) {
        const component = this.room.netobjects.get(message.netid);

        if (component) {
            if (ctx.sender) {
                if (ctx.sender.clientId !== component.ownerId) {
                    await this.banPlayer(ctx.sender, undefined, AnticheatReason.UnownedComponent);
                    return;
                }
                if (!(component instanceof CustomNetworkTransform)) {
                    await this.banPlayer(ctx.sender, undefined, AnticheatReason.IllegalData);
                    return;
                }
            }

            const reader = HazelReader.from(message.data);
            component.Deserialize(reader);
        }
    }

    async checkRpcLegality(message: BaseRpcMessage|undefined, player: PlayerData<Room>, reason: AnticheatReason) {
        if (!message) return;

        const playerRole = this.api.roleService.getPlayerRole(player);
        if (!playerRole || playerRole) {
            await this.banPlayer(player, playerRole, reason);
            return;
        }
        
        const anticheatExceptions = getAnticheatExceptions(playerRole);
        if (!anticheatExceptions.has(AnticheatReason.Venting)) {
            await this.banPlayer(player, playerRole, reason);
            return;
        }
    }
}