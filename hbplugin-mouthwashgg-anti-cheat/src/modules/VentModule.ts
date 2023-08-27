import { AirshipVents, Connection, EnterVentMessage, EventListener, EventTarget, ExitVentMessage, GameMap, MiraHQVents, PolusVents, RoomGameStartEvent, SnapToMessage, TheSkeldVents } from "@skeldjs/hindenburg";
import { InfractionSeverity, MouthwashAntiCheatPlugin } from "../plugin";
import { InfractionName } from "../enums";

interface VentDataModel {
    id: number;
    position: {
        x: number;
        y: number;
    };
    network: number[];
}

export class VentModule extends EventTarget {
    protected gameStartedAt: number;

    constructor(public readonly plugin: MouthwashAntiCheatPlugin) {
        super();
        
        this.gameStartedAt = 0;
    }

    getVentsInMap(): Record<number, VentDataModel>|undefined {
        const map = this.plugin.room.settings.map;
        switch (map) {
            case GameMap.TheSkeld:
            case GameMap.AprilFoolsTheSkeld:
                return TheSkeldVents;
            case GameMap.MiraHQ:
                return MiraHQVents;
            case GameMap.Polus:
                return PolusVents;
            case GameMap.Airship:
                return AirshipVents;
        }
    }

    getVentById(ventId: number) {
        const mapVents = this.getVentsInMap();
        if (!mapVents) return undefined;

        return ventId === -1 ? undefined : mapVents[ventId];
    }

    getPlayerVent(sender: Connection) {
        const player = sender.getPlayer();
        if (!player) return undefined;
        const playerPhysics = player.physics;
        if (!playerPhysics) return undefined;

        return this.getVentById(playerPhysics.ventid);
    }

    async onEnterVent(sender: Connection, enterVentMessage: EnterVentMessage) {
        const enterInfraction = await this.plugin.createInfraction(sender, InfractionName.ForbiddenRpcVent, { ventId: enterVentMessage.ventid }, InfractionSeverity.High);
        if (enterInfraction !== undefined) return enterInfraction;

        // todo: check vent valid for id & position
    }
    
    async onExitVent(sender: Connection, exitVentMessage: ExitVentMessage) {
        const exitInfraction = await this.plugin.createInfraction(sender, InfractionName.ForbiddenRpcVent, { ventId: exitVentMessage.ventid }, InfractionSeverity.High);
        if (exitInfraction !== undefined) return exitInfraction;

        // todo: check vent valid for id & position
    }

    async onSnapTo(sender: Connection, snapToMessage: SnapToMessage) {
        // todo: check game start timer 
        if (this.plugin.room.settings.map === GameMap.Airship) {
            // players are allowed to snap-to to some locations for the first X seconds of the game
        }
    }

    @EventListener()
    onGameStart(ev: RoomGameStartEvent) {
        this.gameStartedAt = Date.now();
    }
}