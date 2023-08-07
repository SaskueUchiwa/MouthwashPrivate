import { RoomGameStartEvent as SkeldjsRoomGameStartEvent } from "@skeldjs/core";
import { CancelableEvent, RevertableEvent } from "@skeldjs/events";
import { Room } from "../../../Room";

export class RoomGameStartEvent extends SkeldjsRoomGameStartEvent implements CancelableEvent, RevertableEvent {
    canceled: boolean;
    reverted: boolean;

    constructor(
        public readonly room: Room
    ) {
        super(room);

        this.canceled = false;
        this.reverted = false;
    }

    revert(): void {
        this.reverted = true;
    }

    cancel(): void {
        this.canceled = true;
    }
}