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

export interface SubmarineBoxCatSystemData {
    position: number;
}

export type SubmarineBoxCatSystemEvents<RoomType extends Hostable = Hostable> = SystemStatusEvents<RoomType> &
    ExtractEventTypes<[]>;

/**
 * See {@link SubmarineBoxCatSystemEvents} for events to listen to.
 */
export class SubmarineBoxCatSystem<RoomType extends Hostable = Hostable> extends SystemStatus<
    SubmarineBoxCatSystemData,
    SubmarineBoxCatSystemEvents,
    RoomType
> implements SubmarineBoxCatSystemData {
    position: number;

    constructor(
        ship: InnerShipStatus<RoomType>,
        systemType: SystemType,
        data?: HazelReader | SubmarineBoxCatSystemData
    ) {
        super(ship, systemType, data);

        this.position ??= 0;
    }

    get sabotaged() {
        return false;
    }

    patch(data: SubmarineBoxCatSystemData) {

    }

    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    Deserialize(reader: HazelReader, spawn: boolean) {
        this.position = reader.uint8();
    }

    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    Serialize(writer: HazelWriter, spawn: boolean) {
        writer.uint8(this.position);
    }

    async HandleSabotage(player: PlayerData|undefined, rpc: RepairSystemMessage|undefined) {

    }

    private async _repair(player: PlayerData|undefined, rpc: RepairSystemMessage|undefined) {

    }

    async repair() {
        if (this.room.hostIsMe) {
            await this._repair(this.room.myPlayer, undefined);
        } else {
            await this._sendRepair(0);
        }
    }

    async HandleRepair(player: PlayerData<RoomType>|undefined, amount: number, rpc: RepairSystemMessage|undefined) {
        switch (amount) {

        }
    }

    Detoriorate(delta: number) {

    }
}
