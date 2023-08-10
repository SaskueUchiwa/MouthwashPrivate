import { RoomGameStartEvent as SkeldjsRoomGameStartEvent, Hostable } from "@skeldjs/core";
import { CancelableEvent } from "@skeldjs/events";

export class RoomGameStartEvent<RoomType extends Hostable = Hostable> extends SkeldjsRoomGameStartEvent<RoomType> implements CancelableEvent {
    canceled: boolean;

    constructor(
        public readonly room: RoomType
    ) {
        super(room);

        this.canceled = false;
    }

    cancel(): void {
        this.canceled = true;
    }
}
