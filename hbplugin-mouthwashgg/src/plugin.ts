import dgram from "dgram";
import crypto from "crypto";

import {
    HindenburgPlugin,
    WorkerPlugin,
    Worker,
    RegisterMessage,
    MessageHandler,
    PacketContext,
    RegisterPrefab,
    Networkable,
    SendOption,
    SpawnType,
    HazelWriter,
    DisconnectPacket,
    DisconnectReason
} from "@skeldjs/hindenburg";

import {
    AllowTaskInteractionMessage,
    BeginCameraAnimationMessage,
    BeginPlayerAnimationMessage,
    CameraController,
    ClickBehaviour,
    ClickMessage,
    CloseHudMessage,
    CustomNetworkTransformGeneric,
    DeadBody,
    DeleteChatMessageMessage,
    DeleteGameOptionMessage,
    DisplayStartGameScreenMessage,
    DisplaySystemAnnouncementMessage,
    FetchResourceMessage,
    Graphic,
    LoadHatMessage,
    LoadPetMessage,
    ModstampSetStringMessage,
    MouthwashMeetingHud,
    MouthwashSpawnType,
    OverwriteGameOver,
    PingPacket,
    ReportDeadBodyMessage,
    SetChatMessageMessage,
    SetChatVisibilityMessage,
    SetGameOptionMessage,
    SetHudStringMessage,
    SetHudVisibility,
    SetOpacityMessage,
    SetOutlineMessage,
    SetQrContentsMessage,
    SetTaskCountsMessage,
    SoundSource
} from "mouthwash-types";

import { MouthwashAuthPlugin } from "hbplugin-mouthwashgg-auth";

import { MouthwashApiPlugin, ClientFetchResourceResponseEvent } from "hbplugin-mouthwashgg-api";

@HindenburgPlugin("hbplugin-mouthwashgg", "1.0.0", "none")
@RegisterMessage(BeginCameraAnimationMessage)
@RegisterMessage(BeginPlayerAnimationMessage)
@RegisterMessage(ClickMessage)
@RegisterMessage(CloseHudMessage)
@RegisterMessage(DeleteChatMessageMessage)
@RegisterMessage(DeleteGameOptionMessage)
@RegisterMessage(DisplayStartGameScreenMessage)
@RegisterMessage(DisplaySystemAnnouncementMessage)
@RegisterMessage(FetchResourceMessage)
@RegisterMessage(ModstampSetStringMessage)
@RegisterMessage(OverwriteGameOver)
@RegisterMessage(PingPacket)
@RegisterMessage(SetChatMessageMessage)
@RegisterMessage(SetChatVisibilityMessage)
@RegisterMessage(SetGameOptionMessage)
@RegisterMessage(SetHudStringMessage)
@RegisterMessage(SetHudVisibility)
@RegisterMessage(SetOutlineMessage)
@RegisterMessage(SetOpacityMessage)
@RegisterMessage(SetQrContentsMessage)
@RegisterMessage(ReportDeadBodyMessage)
@RegisterMessage(LoadHatMessage)
@RegisterMessage(LoadPetMessage)
@RegisterMessage(AllowTaskInteractionMessage)
@RegisterMessage(SetTaskCountsMessage)
@RegisterPrefab(SpawnType.MeetingHud, [ MouthwashMeetingHud ])
@RegisterPrefab(MouthwashSpawnType.Button, [ CustomNetworkTransformGeneric, Graphic, ClickBehaviour ] as typeof Networkable[])
@RegisterPrefab(MouthwashSpawnType.DeadBody, [ DeadBody, CustomNetworkTransformGeneric ] as typeof Networkable[])
@RegisterPrefab(MouthwashSpawnType.SoundSource, [ SoundSource, CustomNetworkTransformGeneric ] as typeof Networkable[])
@RegisterPrefab(MouthwashSpawnType.CameraController, [ CameraController ] as typeof Networkable[])
export class MouthwashPlugin extends WorkerPlugin {
    private _authApi?: MouthwashAuthPlugin;

    constructor(
        public readonly worker: Worker,
        public readonly config: any
    ) {
        super(worker, config);

        for (const [ , socket ] of this.worker.listenSockets) {
            socket.removeAllListeners();
            socket.on("message", this.handlePossiblySignedMessage.bind(this, socket));
        }

        clearInterval(this.worker.pingInterval);
        
        this.worker.pingInterval = setInterval(() => {
            const dateNow = Date.now();
            for (const [ , connection ] of this.worker.connections) {
                if (connection.sentPackets.length === 8 && connection.sentPackets.every(packet => (dateNow - packet.sentAt) > 1500 && !packet.acked)) {
                    this.logger.warn("%s failed to acknowledge any of the last 8 reliable packets sent, presumed dead",
                        connection);
    
                    connection.disconnect();
                    continue;
                }

                connection.sendPacket(new PingPacket);
                for (let i = 0; i < connection.sentPackets.length; i++) {
                    const sent = connection.sentPackets[i];
                    if (!sent.acked) {
                        if (Date.now() - sent.sentAt > 1500) {
                            this.worker.sendRawPacket(connection.listenSocket, connection.remoteInfo, sent.buffer);
                            sent.sentAt = Date.now();
                        }
                    }
                }
            }
        }, 2000);
    }

    get authApi() {
        this._authApi ??= this.worker.loadedPlugins.get("hbplugin-mouthwashgg-auth")?.pluginInstance as MouthwashAuthPlugin;
        return this._authApi;
    }

    async handlePossiblySignedMessage(listenSocket: dgram.Socket, message: Buffer, rinfo: dgram.RemoteInfo) {
        if (!this.authApi) {
            if (message[0] === 0x80) {
                return this.worker.handleMessage(listenSocket, message.slice(37), rinfo);
            }
            return this.worker.handleMessage(listenSocket, message, rinfo);
        }

        if (message[0] === SendOption.Acknowledge) {
            return this.worker.handleMessage(listenSocket, message, rinfo);
        }

        if (message[0] !== 0x80) {
            return this.logger.warn("%s:%s sent unauthenticated message", rinfo.address, rinfo.port);
        }

        if (message[0] === 0x80) {
            const uuid = message.slice(1, 5).toString("hex") + "-"
                + message.slice(5, 7).toString("hex") + "-"
                + message.slice(7, 9).toString("hex") + "-"
                + message.slice(9, 11).toString("hex") + "-"
                + message.slice(11, 17).toString("hex");

            const connection = this.worker.connections.get(rinfo.address + ":" + rinfo.port);
            const cachedSession = connection && this.authApi.connectionSessionCache.get(connection);
            const sessionInfo = (connection && cachedSession) || await this.authApi.getSession(uuid);

            if (sessionInfo) {
                if (connection && !cachedSession) {
                    this.authApi.connectionSessionCache.set(connection, sessionInfo);
                }

                const hmacHash = message.slice(17, 37);
                const signedMessage = crypto.createHmac("sha1", sessionInfo.client_token).update(message.slice(37)).digest();
                if (hmacHash.length === signedMessage.length && crypto.timingSafeEqual(hmacHash, signedMessage)) {
                    return this.worker.handleMessage(listenSocket, message.slice(37), rinfo);
                }
            } else {
                if (connection) {
                    await connection.disconnect("Invalid login, try logging in again through the launcher.");
                } else {
                    const disconnectPacket = new DisconnectPacket(DisconnectReason.Custom, "Invalid login, try logging in again through the launcher.");
                    this.logger.info("Disconnected unknown client due to invalid login");
                    const writer = HazelWriter.alloc(64);
                    writer.uint8(SendOption.Disconnect);
                    writer.write(disconnectPacket);
                    writer.realloc(writer.cursor);
                    this.worker.sendRawPacket(listenSocket, rinfo, writer.buffer);
                }
                return;
            }
        }
    }

    @MessageHandler(SetGameOptionMessage)
    async onSetGameOption(message: SetGameOptionMessage, context: PacketContext) {
        if (!context.sender)
            return;

        const room = context.sender.room;

        if (!room)
            return;

        const roomApi = room.loadedPlugins.get("hbplugin-mouthwashgg-api")?.pluginInstance as MouthwashApiPlugin;
        roomApi.gameOptions.handleMessage(message, context.sender);
    }

    @MessageHandler(FetchResourceMessage)
    async onFetchResourceResponse(message: FetchResourceMessage, context: PacketContext) {
        if (!context.sender)
            return;

        const room = context.sender.room;

        if (!room)
            return;

        await room.emit(
            new ClientFetchResourceResponseEvent(
                context.sender,
                message.resourceId,
                message.response
            )
        );
    }
}