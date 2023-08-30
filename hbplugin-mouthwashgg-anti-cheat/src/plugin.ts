import * as crypto from "crypto";

import {
    Connection,
    HindenburgPlugin,
    MessageHandler,
    MessageHandlerCallback,
    PacketContext,
    PlayerData,
    Room,
    RoomGameEndEvent,
    RoomPlugin,
    RpcMessage,
    SpawnType,
    SyncSettingsMessage,
    EventListener,
    RoomDestroyEvent,
    BaseRpcMessage,
    CastVoteMessage,
    CheckColorMessage,
    CheckNameMessage,
    ClimbLadderMessage,
    CloseDoorsOfTypeMessage,
    CompleteTaskMessage,
    EnterVentMessage,
    ExitVentMessage,
    MurderPlayerMessage,
    RepairSystemMessage,
    SendChatMessage,
    SendChatNoteMessage,
    SetHatMessage,
    RpcMessageTag,
    SendQuickChatMessage,
    SetPetMessage,
    SetScanner,
    SetStartCounterMessage,
    UpdateSystemMessage,
    UsePlatformMessage,
    Color,
    Networkable,
    PlayerControl,
    PlayerPhysics,
    CustomNetworkTransform,
    SetSkinMessage,
    Pet,
    Hat,
    Skin,
    SnapToMessage,
    ReportDeadBodyMessage as AmongUsReportDeadBodyMessage,
    InnerShipStatus
} from "@skeldjs/hindenburg";

import { BaseRole, Crewmate, Impostor, MouthwashApiPlugin, RoleCtr } from "hbplugin-mouthwashgg-api";
import { MouthwashggMetricsPlugin } from "hbplugin-mouthwashgg-metrics";

import {
    CameraController,
    ClickBehaviour,
    ClickMessage,
    DeadBody,
    MouthwashRpcMessageTag,
    MouthwashSpawnType,
    ReportDeadBodyMessage
} from "mouthwash-types";

import { CollidersService } from "./Colliders";
import { InfractionName } from "./enums";
import { MouthwashAuthPlugin } from "hbplugin-mouthwashgg-auth";
import { getAnticheatExceptions } from "./hooks";

import { ChatModule, MeetingModule, RepairModule, VentModule } from "./modules";

export enum InfractionSeverity {
    /**
     * Shouldn't happen in perfect gameplay but could very well happen under medium-high
     * ping.
     */
    Low = "LOW",
    /**
     * Could easily happen with higher ping, or could be the result of client-server
     * desync and has little to no significant impact on gameplay. Alternatively, important
     * side information that could be used alongside other infraction logs to determine
     * if a player is cheating.
     */
    Medium = "MEDIUM",
    /**
     * Could theoretically happen with high ping but never with low ping, or is a
     * cheat that should be impossible but doesn't have any significant impact on gameplay.
     */
    High = "HIGH",
    /**
     * Should _never_ happen even with extremely high ping and has a major
     * impact on gameplay.
     */
    Critical = "CRITICAL"
}

export interface PlayerInfraction {
    userId: string|null;
    gameId: string|null;
    createdAt: Date;
    playerPing: number;
    infractionName: string;
    additionalDetails: any;
    severity: InfractionSeverity;
}

const impostorExceptions = new Set([ InfractionName.ForbiddenRpcSabotage, InfractionName.ForbiddenRpcVent ]);
const crewmateExceptions = new Set([ InfractionName.ForbiddenRpcRepair ]);

@HindenburgPlugin("hbplugin-mouthwashgg-anti-cheat", "1.0.0", "last")
export class MouthwashAntiCheatPlugin extends RoomPlugin {
    collidersService: CollidersService;
    api!: MouthwashApiPlugin;
    authApi: MouthwashAuthPlugin;

    metrics?: MouthwashggMetricsPlugin;
    unflushedPlayerInfractions: PlayerInfraction[];

    ventModule: VentModule;
    meetingModule: MeetingModule;
    chatModule: ChatModule;
    repairModule: RepairModule;

    constructor(
        public readonly room: Room,
        public readonly config: any
    ) {
        super(room, config);

        this.collidersService = new CollidersService(this);
        this.metrics = this.getDependencyUnsafe("hbplugin-mouthwashgg-metrics", "worker") as MouthwashggMetricsPlugin|undefined;
        this.authApi = this.assertDependency("hbplugin-mouthwashgg-auth", "worker") as MouthwashAuthPlugin;
        this.api = this.assertDependency("hbplugin-mouthwashgg-api", "room") as MouthwashApiPlugin;

        this.unflushedPlayerInfractions = [];
        
        this.ventModule = new VentModule(this);
        this.meetingModule = new MeetingModule(this);
        this.chatModule = new ChatModule(this);
        this.repairModule = new RepairModule(this);
    }

    async onPluginLoad() {
        await this.collidersService.loadAllColliders();
        this.room.registerEventTarget(this.ventModule);
        this.room.registerEventTarget(this.meetingModule);
        this.room.registerEventTarget(this.repairModule);
        this.logger.info("Loaded colliders for maps");
    }

    async onPluginUnload() {
        this.room.removeEventTarget(this.ventModule);
        this.room.removeEventTarget(this.meetingModule);
        this.room.removeEventTarget(this.repairModule);
    }

    // async banPlayer(player: PlayerData<Room>|Connection, role: BaseRole|undefined, reason: AnticheatReason) {
    //     const connection = player instanceof Connection ? player : this.room.connections.get(player.clientId);
    //     if (!connection) return;

    //     this.room.bannedAddresses.add(connection.remoteInfo.address);
    //     if (!role) {
    //         this.logger.info("Banned %s for reason '%s'",
    //             player, reason);
    //     } else {
    //         this.logger.info("Banned %s for reason '%s' (role %s, %s)",
    //             player, reason, role.metadata.roleName, RoleAlignment[role.metadata.alignment]);
    //     }
    //     connection.disconnect(DisconnectReason.Banned);
    // }

    async flushPlayerInfractions() {
        const lobbyId = this.metrics?.lobbyIds.get(this.room);
        if (this.unflushedPlayerInfractions.length === 0) {
            this.logger.info("No infractions to flush");
            return;
        }

        if (this.metrics === undefined) {
            this.logger.warn("No metrics plugin to flush infractions to, please ensure that the plugin is loaded alongside this one");
            return;
        }

        const params = [];
        for (const playerInfraction of this.unflushedPlayerInfractions) {
            params.push(crypto.randomUUID(), playerInfraction.userId, lobbyId || null, playerInfraction.gameId, playerInfraction.createdAt,
                playerInfraction.playerPing, playerInfraction.infractionName, playerInfraction.additionalDetails, playerInfraction.severity);
        }
        const { rows: addedInfractions } = await this.metrics?.postgresClient.query(`
            INSERT INTO player_infraction(id, user_id, lobby_id, game_id, created_at, player_ping, infraction_name, additional_details, severity)
            VALUES ${this.unflushedPlayerInfractions.map((_uploadLobbiesInterval, i) =>
                `($${(i * 9) + 1}, $${(i * 9) + 2}, $${(i * 9) + 3}, $${(i * 9) + 4}, $${(i * 9) + 5}, $${(i * 9) + 6}, $${(i * 9) + 7}, $${(i * 9) + 8}, $${(i * 9) + 9})`)
                .join(",")}
            RETURNING *
        `, params);
        this.logger.info("Flushed %s/%s infractions", addedInfractions.length, this.unflushedPlayerInfractions.length);
        this.unflushedPlayerInfractions = [];
    }

    getInfractions<T extends BaseRole>(role: T) {
        if (role.constructor === Impostor) {
            return impostorExceptions;
        } else if (role.constructor === Crewmate) {
            return crewmateExceptions;
        }
        
        return getAnticheatExceptions(role["constructor"] as RoleCtr);
    }

    async createInfraction(playerOrConnection: PlayerData<Room>|Connection, infractionName: InfractionName, additionalDetails: any, severity: InfractionSeverity) {
        const gameId = this.metrics?.lobbyCurrentGameIds.get(this.room);
        const connection = playerOrConnection instanceof Connection ? playerOrConnection : this.room.getConnection(playerOrConnection);
        const player = playerOrConnection instanceof PlayerData ? playerOrConnection : playerOrConnection.getPlayer();
        if (!connection) {
            this.logger.warn("Tried to log infraction %s (%s) for %s, but they didn't have a connection on the server",
                infractionName, severity, player);
            return;
        }
        if (!player) {
            this.logger.warn("Tried to log infraction %s (%s) for %s, but they didn't have a player in the room",
                infractionName, severity, player);
            return;
        }
        const playerRole = this.api.roleService.getPlayerRole(player);
        if (playerRole !== undefined) {
            const exceptions = this.getInfractions(playerRole);
            if (exceptions.has(infractionName))
                return;
        }

        const connectionUser = await this.authApi.getConnectionUser(connection);
        if (!connectionUser) {
            this.logger.warn("Tried to log infraction %s (%s) for %s, but they don't appear to be logged in",
                infractionName, severity, player);
            return;
        }

        const infraction: PlayerInfraction = {
            userId: connectionUser.id,
            gameId: gameId || null,
            createdAt: new Date,
            playerPing: connection.roundTripPing,
            infractionName,
            additionalDetails,
            severity
        };

        this.unflushedPlayerInfractions.push(infraction);

        if (severity !== "LOW") {
            this.logger.warn("Player %s violated infraction rule %s (%s unflushed infraction%s)",
                player, infractionName, this.unflushedPlayerInfractions.length, this.unflushedPlayerInfractions.length === 1 ? "" : "s");
            return infraction;
        }

        if (this.unflushedPlayerInfractions.length > 100) {
            this.flushPlayerInfractions();
        }
        
        return infraction;
    }

    async onRpcMessageData(component: Networkable, rpcMessage: BaseRpcMessage, sender: Connection) {
        if (!(rpcMessage.messageTag in RpcMessageTag) && !(rpcMessage.messageTag in MouthwashRpcMessageTag))
            return this.createInfraction(sender, InfractionName.InvalidRpcCode, { netId: component.netId, rpcId: rpcMessage.messageTag }, InfractionSeverity.High);

        switch (rpcMessage.messageTag) {
        case RpcMessageTag.AddVote:
            // TODO: used for votebansystem - do we even have this?
            // const addVoteMessage = rpcMessage as AddVoteMessage;
            // return this.createInfraction(sender, InfractionName.InvalidRpcColor, { rpcId: RpcMessageTag.AddVote }, InfractionSeverity.Critical);
        case RpcMessageTag.CastVote:
            const castVoteInfraction = await this.meetingModule.onCastVoteMessage(sender, rpcMessage as CastVoteMessage);
            if (castVoteInfraction)
                return castVoteInfraction;
            break;
        case RpcMessageTag.CheckColor:
            const checkColorMessage = rpcMessage as CheckColorMessage;
            if (!(checkColorMessage.color in Color))
                return this.createInfraction(sender, InfractionName.InvalidRpcColor,
                    { colorId: checkColorMessage.color },  InfractionSeverity.Critical);
            break;
        case RpcMessageTag.CheckName:
            const checkNameMessage = rpcMessage as CheckNameMessage;
            const checkNameConnectionUser = await this.authApi.getConnectionUser(sender);
            if (!checkNameConnectionUser) return;
            if (checkNameMessage.name !== checkNameConnectionUser.display_name) {
                return this.createInfraction(sender, InfractionName.InvalidRpcName,
                    { name: checkNameMessage.name },  InfractionSeverity.Critical);
            }
            break;
        case RpcMessageTag.ClearVote:
        case RpcMessageTag.Close:
        case RpcMessageTag.Exiled:
        case RpcMessageTag.MurderPlayer:
        case RpcMessageTag.PlayAnimation:
        case RpcMessageTag.SetInfected:
        case RpcMessageTag.SetTasks:
        case RpcMessageTag.SetName:
        case RpcMessageTag.SetColor:
        case RpcMessageTag.StartMeeting:
        case RpcMessageTag.SyncSettings:
        case RpcMessageTag.VotingComplete:
        case RpcMessageTag.BootFromVent:
        case RpcMessageTag.SendChatNote:
        case MouthwashRpcMessageTag.SetOpacity:
        case MouthwashRpcMessageTag.SetOutline:
        case MouthwashRpcMessageTag.SetPlayerSpeedModifier:
        case MouthwashRpcMessageTag.SetPlayerVisionModifier:
        case MouthwashRpcMessageTag.BeginPlayerAnimation:
        case MouthwashRpcMessageTag.SetChatVisibility:
        case MouthwashRpcMessageTag.CloseHud:
        case MouthwashRpcMessageTag.BeginCameraAnimation:
            return this.createInfraction(sender, InfractionName.ForbiddenRpcCode, { netId: component.netId, rpcId: rpcMessage.messageTag, spawnType: component.spawnType }, InfractionSeverity.Critical);
        case RpcMessageTag.ReportDeadBody:
            const reportDeadBodyInfraction = await this.meetingModule.onReportDeadBody(sender, rpcMessage as AmongUsReportDeadBodyMessage);
            if (reportDeadBodyInfraction)
                return reportDeadBodyInfraction;
            break;
        case RpcMessageTag.ClimbLadder:
            const climbLadderMessage = rpcMessage as ClimbLadderMessage;
            break;
        case RpcMessageTag.CloseDoorsOfType:
            const closeDoorsOfTypeMessage = rpcMessage as CloseDoorsOfTypeMessage;
            break;
        case RpcMessageTag.CompleteTask:
            const completeTaskMessage = rpcMessage as CompleteTaskMessage;
            break;
        case RpcMessageTag.EnterVent:
            const enterVentInfraction = await this.ventModule.onEnterVent(sender, rpcMessage as EnterVentMessage);
            if (enterVentInfraction)
                return enterVentInfraction;
            break;
        case RpcMessageTag.ExitVent:
            const exitVentInfraction = await this.ventModule.onExitVent(sender, rpcMessage as ExitVentMessage);
            if (exitVentInfraction)
                return exitVentInfraction;
            break;
        case RpcMessageTag.MurderPlayer: // Murders are replaced by button presses
            const murderPlayerMessage = rpcMessage as MurderPlayerMessage;
        case RpcMessageTag.RepairSystem:
            const repairSystemInfraction = await this.repairModule.onRepairSystem(sender, rpcMessage as RepairSystemMessage);
            if (repairSystemInfraction)
                return repairSystemInfraction;
            break;
        case RpcMessageTag.SendChat:
            const sendChatInfraction = await this.chatModule.onChatMessage(sender, rpcMessage as SendChatMessage);
            if (sendChatInfraction)
                return sendChatInfraction;
            break;
        case RpcMessageTag.SendQuickChat:
            const sendQuickChatMessage = rpcMessage as SendQuickChatMessage;
            break;
        case RpcMessageTag.SetHat:
            const setHatMessage = rpcMessage as SetHatMessage;
            if (setHatMessage.hat === 9999999 as Hat) return;
            const setHatConnectionUser = await this.authApi.getConnectionUser(sender);
            if (setHatConnectionUser) {
                if (!(setHatMessage.hat in Hat) && setHatConnectionUser.owned_cosmetics.findIndex(cosmetic => cosmetic.among_us_id === setHatMessage.hat && cosmetic.type === "HAT") === -1) {
                    return this.createInfraction(sender, InfractionName.InvalidRpcHat, { hatId: setHatMessage.hat }, InfractionSeverity.Critical);
                }
            }
        case RpcMessageTag.SetPet:
            const setPetMessage = rpcMessage as SetPetMessage;
            if (setPetMessage.pet === 9999999 as Pet) return;
            const setPetConnectionUser = await this.authApi.getConnectionUser(sender);
            if (!setPetConnectionUser) return;
            if (setPetConnectionUser) {
                if (!(setPetMessage.pet in Pet) && setPetConnectionUser.owned_cosmetics.findIndex(cosmetic => cosmetic.among_us_id === setPetMessage.pet && cosmetic.type === "PET") === -1) {
                    return this.createInfraction(sender, InfractionName.InvalidRpcPet, { petId: setPetMessage.pet }, InfractionSeverity.Critical);
                }
            }
        case RpcMessageTag.SetSkin:
            const setSkinMessage = rpcMessage as SetSkinMessage;
            if (setSkinMessage.skin === 9999999 as Skin) return;
            if (!(setSkinMessage.skin in Skin)) {
                return this.createInfraction(sender, InfractionName.InvalidRpcSkin, { skinId: setSkinMessage.skin }, InfractionSeverity.Critical);
            }
        case RpcMessageTag.SetScanner:
            const setScannerMessage = rpcMessage as SetScanner;
            break;
        case RpcMessageTag.SetStartCounter:
            const setStartCounterMessage = rpcMessage as SetStartCounterMessage;
            if (!this.room.actingHostIds.has(sender.clientId) && setStartCounterMessage.counter !== -1) {
                return this.createInfraction(sender, InfractionName.ForbiddenRpcCode, { netId: component.netId, rpcId: rpcMessage.messageTag, spawnType: component.spawnType }, InfractionSeverity.Critical);
            }
            break;
        case RpcMessageTag.SnapTo:
            const snapToInfraction = await this.ventModule.onSnapTo(sender, rpcMessage as SnapToMessage);
            if (snapToInfraction)
                return snapToInfraction;
            break;
        case RpcMessageTag.UpdateSystem:
            const updateSystemMessage = rpcMessage as UpdateSystemMessage;
            break;
        case RpcMessageTag.UsePlatform:
            const usePlatformMessage = rpcMessage as UsePlatformMessage;
            break;
        case MouthwashRpcMessageTag.Click:
            const clickMessage = rpcMessage as ClickMessage;
            break;
        case MouthwashRpcMessageTag.SetCountingDown:
            const setCountingDownMessage = rpcMessage;
            break;
        case MouthwashRpcMessageTag.ReportDeadBody:
            const reportDeadBodyMessage = rpcMessage as ReportDeadBodyMessage;
            break;
        default:
            return this.createInfraction(sender, InfractionName.InvalidRpcCode, { netId: component.netId, rpcId: rpcMessage.messageTag }, InfractionSeverity.High);
        }

        switch (rpcMessage.messageTag as number) {
            case RpcMessageTag.AddVote:
                if (this.room.voteBanSystem === component) return;
                break;
            case RpcMessageTag.CastVote:
            case RpcMessageTag.ClearVote:
            case RpcMessageTag.Close:
            case RpcMessageTag.VotingComplete:
                if (this.room.meetingHud === component) return;
                break;
            case RpcMessageTag.CheckColor:
            case RpcMessageTag.CheckName:
            case RpcMessageTag.CompleteTask:
            case RpcMessageTag.Exiled:
            case RpcMessageTag.MurderPlayer:
            case RpcMessageTag.PlayAnimation:
            case RpcMessageTag.ReportDeadBody:
            case RpcMessageTag.SendChat:
            case RpcMessageTag.SendChatNote:
            case RpcMessageTag.SendQuickChat:
            case RpcMessageTag.SetColor:
            case RpcMessageTag.SetHat:
            case RpcMessageTag.SetInfected:
            case RpcMessageTag.SetName:
            case RpcMessageTag.SetPet:
            case RpcMessageTag.SetScanner:
            case RpcMessageTag.SetSkin:
            case RpcMessageTag.SetStartCounter:
            case RpcMessageTag.SetTasks:
            case RpcMessageTag.StartMeeting:
            case RpcMessageTag.SyncSettings:
            case RpcMessageTag.UsePlatform:
            case MouthwashRpcMessageTag.SetOpacity:
            case MouthwashRpcMessageTag.SetOutline:
            case MouthwashRpcMessageTag.SetPlayerSpeedModifier:
            case MouthwashRpcMessageTag.SetPlayerVisionModifier:
            case MouthwashRpcMessageTag.BeginPlayerAnimation:
                if (component instanceof PlayerControl) return;
                break;
            case RpcMessageTag.ClimbLadder:
            case RpcMessageTag.EnterVent:
            case RpcMessageTag.ExitVent:
                if (component instanceof PlayerPhysics) return;
                break;
            case RpcMessageTag.SnapTo:
                if (component instanceof CustomNetworkTransform) return;
                break;
            case RpcMessageTag.RepairSystem:
            case RpcMessageTag.CloseDoorsOfType:
                if (this.room.shipStatus === component) return;
                break;
            case MouthwashRpcMessageTag.SetChatVisibility:
            case MouthwashRpcMessageTag.CloseHud:
            if (this.room.gameData === component) return;
                break;
            case MouthwashRpcMessageTag.BeginCameraAnimation:
                if (component instanceof CameraController) return;
                break;
            case MouthwashRpcMessageTag.SetCountingDown:
            case MouthwashRpcMessageTag.Click:
                if (component instanceof ClickBehaviour) return;
                break;
            case MouthwashRpcMessageTag.ReportDeadBody:
                if (component instanceof DeadBody) return;
                break;
        }
        return this.createInfraction(sender, InfractionName.ForbiddenRpcCode, { netId: component.netId, rpcId: rpcMessage.messageTag, spawnType: component.spawnType }, InfractionSeverity.Critical);
    }

    async verifyComponentOwnership(component: Networkable<Room>, sender: Connection) {
        if (component.ownerId === -1 || component.ownerId !== sender.clientId) {
            // dead bodies and buttons are done via their network id, rather than the playercontrol.
            if (component.spawnType === MouthwashSpawnType.Button as number) {
                const button = this.api.hudService.buttonsByNetId.get(component.netId);
                if (button && button.player.clientId === sender.clientId) {
                    return true;
                }
            } else if (component.spawnType === MouthwashSpawnType.DeadBody as number) {
                return true;
            }
            return false;
        }
        return true;
    }

    @MessageHandler(RpcMessage, { override: true })
    async onRpcMessage(message: RpcMessage, context: PacketContext, originalHandlers: MessageHandlerCallback<RpcMessage>[]) {
        if (this.room.host && this.room.host.clientId === context.sender?.clientId && !this.room["finishedActingHostTransactionRoutine"] && message.data instanceof SyncSettingsMessage) {
            this.logger.info("Got initial settings, acting host handshake complete");
            this.room["finishedActingHostTransactionRoutine"] = true;
            this.room.settings.patch(message.data.settings);
            return;
        }

        const component = this.room.netobjects.get(message.netid);
        if (component) {
            if (context.sender) {
                if (message.data.messageTag !== RpcMessageTag.UpdateSystem && !await this.verifyComponentOwnership(component, context.sender)) {
                    if (!(component instanceof InnerShipStatus) || message.data.messageTag !== RpcMessageTag.RepairSystem) {
                        this.createInfraction(context.sender, InfractionName.ForbiddenRpcInnernetObject, { netId: message.netid, rpcId: message.data.messageTag }, InfractionSeverity.Critical);
                        return;
                    }
                }
                const infraction = await this.onRpcMessageData(component, message.data, context.sender);
                if (infraction && infraction.severity === InfractionSeverity.Critical) return;
            }

            try {
                await component.HandleRpc(message.data);
            } catch (e) {
                this.logger.error("Could not process remote procedure call from client %s (net id %s, %s): %s",
                    context.sender, component.netId, SpawnType[component.spawnType] || "Unknown", e);
            }
        } else {
            if (context.sender) {
                this.createInfraction(context.sender, InfractionName.UnknownRpcInnernetObject, { netId: message.netid, rpcId: message.data.messageTag }, InfractionSeverity.Medium);
            }
            this.logger.warn("Got remote procedure call for non-existent component: net id %s. There is a chance that a player is using this to communicate discreetly with another player", message.netid);
        }
    }

    @EventListener("room.gameend")
    async onRoomGameEnd(ev: RoomGameEndEvent<Room>) {
        await this.flushPlayerInfractions();
    }

    @EventListener("room.destroy")
    async onRoomDestroy(ev: RoomDestroyEvent) {
        await this.flushPlayerInfractions();
    }
}