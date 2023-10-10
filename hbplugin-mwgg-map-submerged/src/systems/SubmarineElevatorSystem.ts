import { HazelReader, HazelWriter } from "@skeldjs/util";
import { SystemType } from "@skeldjs/constant";
import { RepairSystemMessage } from "@skeldjs/protocol";
import { ExtractEventTypes } from "@skeldjs/events";

import {
    InnerShipStatus,
    SystemStatus,
    SystemStatusEvents,
    PlayerData,
    Hostable
} from "@skeldjs/core";
import { ElevatorBounds } from "../data";
import { SubmergedSystemType } from "../enums";

export enum ElevatorMovementStage {
    DoorsClosing,
    FadingToBlack,
    ElevatorMovingOut,
    Wait,
    ElevatorMovingIn,
    FadingToClear,
    DoorsOpening,
    Complete
}

export interface SubmarineElevatorSystemData {
    upperDeckIsTargetFloor: boolean;
    moving: boolean;
    tandemElevator: SubmergedSystemType;
}

export type SubmarineElevatorSystemEvents<RoomType extends Hostable = Hostable> = SystemStatusEvents<RoomType> &
    ExtractEventTypes<[]>;

/**
 * See {@link SubmarineElevatorSystemEvents} for events to listen to.
 */
export class SubmarineElevatorSystem<RoomType extends Hostable = Hostable> extends SystemStatus<
    SubmarineElevatorSystemData,
    SubmarineElevatorSystemEvents,
    RoomType
> implements SubmarineElevatorSystemData {
    static stageTimings = [
        0.4,
        0.5,
        1.25,
        0.25,
        1.25,
        0.5,
        0.2
    ];

    upperDeckIsTargetFloor: boolean;
    moving: boolean;
    tandemElevator: SubmergedSystemType;

    private lastStage: ElevatorMovementStage;
    private lerpTimer: number;
    private totalTimer: number;

    constructor(
        ship: InnerShipStatus<RoomType>,
        systemType: SystemType,
        data?: HazelReader | SubmarineElevatorSystemData
    ) {
        super(ship, systemType, data);

        this.upperDeckIsTargetFloor = false;
        this.moving = false;
        this.tandemElevator = SubmergedSystemType.Nil;

        this.lastStage = ElevatorMovementStage.Complete;
        this.lerpTimer = 0;
        this.totalTimer = 0;
    }

    get sabotaged() {
        return false;
    }

    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    Deserialize(reader: HazelReader, spawn: boolean) {
        this.upperDeckIsTargetFloor = reader.bool();
        this.moving = reader.bool();
        const lastStage = reader.uint8();
        if (this.lastStage !== lastStage) {
            this.lastStage = lastStage;
            this.lerpTimer = 0;
        }
    }

    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    Serialize(writer: HazelWriter, spawn: boolean) {
        writer.bool(this.upperDeckIsTargetFloor);
        writer.bool(this.moving);
        writer.uint8(this.lastStage);
    }

    async HandleRepair(player: PlayerData<RoomType>|undefined, amount: number, rpc: RepairSystemMessage|undefined) {
        switch (amount) {
            case 2:
                if (!this.moving) {
                    this.moving = true;
                    this.dirty = true;
                    this.lerpTimer = 0;
                    this.totalTimer = 0;
                    this.lastStage = ElevatorMovementStage.Complete;
                    this.upperDeckIsTargetFloor = !this.upperDeckIsTargetFloor;
                }
                break;
        }
    }

    private getNextStage(): ElevatorMovementStage {
        let sum = 0;
        for (let i = 0; i < SubmarineElevatorSystem.stageTimings.length; i++) {
            sum += SubmarineElevatorSystem.stageTimings[i];
            if (this.totalTimer <= sum) {
                return i;
            }
        }

        return ElevatorMovementStage.DoorsOpening;
    }

    getPlayersInside() {
        const players = [];
        const bounds = ElevatorBounds[this.systemType as number as SubmergedSystemType];

        const isUpper = !this.upperDeckIsTargetFloor;

        if (!bounds)
            throw new Error("No elevator bounds; systemType is " + this.systemType);

        for (const [ , player ] of this.room.players) {
            const position = player.transform?.position;
            if (!position)
                continue;

            if (isUpper) {
                if (bounds.upper.contains(position))
                    players.push(player);
            } else {
                if (bounds.lower.contains(position))
                    players.push(player);
            }
        }

        return players;
    }

    Detoriorate(delta: number) {
        if (!this.moving) {
            this.lerpTimer = 0;
            this.totalTimer = 0;
            this.lastStage = ElevatorMovementStage.Complete;
            return;
        }
        this.totalTimer += delta;
        this.lerpTimer += delta;
        if (this.room.hostIsMe) {
            const nextStage = this.getNextStage();
            if (this.lastStage !== nextStage) {
                if (nextStage > ElevatorMovementStage.ElevatorMovingIn) {
                    for (const player of this.getPlayersInside()) {
                        // move player floor
                    }
                }
                this.lerpTimer = 0;
                this.dirty = true;
            }
            this.lastStage = nextStage;
        }
    }
}
