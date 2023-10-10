import { HazelReader, HazelWriter } from "@skeldjs/util";
import { SystemType } from "@skeldjs/constant";
import { RpcMessage } from "@skeldjs/protocol";
import { ExtractEventTypes } from "@skeldjs/events";

import {
    InnerShipStatus,
    SystemStatus,
    SystemStatusEvents,
    PlayerData,
    Hostable
} from "@skeldjs/core";

import { AcknowledgeChangeFloorMessage } from "../packets";

export interface SubmarinePlayerFloorSystemData {
    playerFloors: Map<number, PlayerFloor>;
}

export type SubmarinePlayerFloorSystemEvents<RoomType extends Hostable = Hostable> = SystemStatusEvents<RoomType> &
    ExtractEventTypes<[]>;

export enum PlayerFloor {
    LowerDeck,
    UpperDeck
}

/**
 * See {@link SubmarinePlayerFloorSystemEvents} for events to listen to.
 */
export class SubmarinePlayerFloorSystem<RoomType extends Hostable = Hostable> extends SystemStatus<
    SubmarinePlayerFloorSystemData,
    SubmarinePlayerFloorSystemEvents,
    RoomType
> implements SubmarinePlayerFloorSystemData {
    playerFloors: Map<number, PlayerFloor>;

    constructor(
        ship: InnerShipStatus<RoomType>,
        systemType: SystemType,
        data?: HazelReader | SubmarinePlayerFloorSystemData
    ) {
        super(ship, systemType, data);

        this.playerFloors = new Map;
    }

    get sabotaged() {
        return false;
    }

    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    Deserialize(reader: HazelReader, spawn: boolean) {
        const num = reader.uint8();
        for (let i = 0; i < num; i++) {
            const playerId = reader.uint8();
            const floor = reader.uint8() as PlayerFloor;

            this.playerFloors.set(playerId, floor);
        }
    }

    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    Serialize(writer: HazelWriter, spawn: boolean) {
        writer.uint8(this.playerFloors.size);
        for (const [ playerId, floor ] of this.playerFloors) {
            writer.uint8(playerId);
            writer.uint8(floor);
        }
        this.dirty = spawn;
    }

    private _rpcRespondToFloorChange(physicsNetId: number, sequenceId: number) {
        this.room.messageStream.push(
            new RpcMessage(
                this.ship.netId,
                new AcknowledgeChangeFloorMessage(
                    physicsNetId,
                    sequenceId
                )
            )
        );
    }

    respondToFloorChange(player: PlayerData, sequenceId: number) {
        if (!player.physics)
            throw new Error("Player needs a physics component to change floors");

        this._rpcRespondToFloorChange(player.physics.netId, sequenceId);
    }

    Detoriorate(delta: number) {
        if (!this.room.gameData)
            return;

        if (this.playerFloors.size === this.room.gameData.players.size)
            return;

        for (const [ playerId ] of this.room.gameData.players) {
            this.playerFloors.set(playerId, PlayerFloor.LowerDeck);
        }
    }
}
