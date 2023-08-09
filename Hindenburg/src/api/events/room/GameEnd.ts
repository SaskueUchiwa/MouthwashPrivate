import { EndGameIntent, GameOverReason, RoomGameEndEvent as SkeldjsRoomGameEndEvent, Hostable } from "@skeldjs/core";
import { CancelableEvent } from "@skeldjs/events";

export class RoomGameEndEvent<RoomType extends Hostable = Hostable> extends SkeldjsRoomGameEndEvent<RoomType> implements CancelableEvent {
    canceled: boolean;

    constructor(
        public readonly room: RoomType,
        public readonly reason: GameOverReason,
        public readonly intent?: EndGameIntent
    ) {
        super(room, reason);

        this.canceled = false;
    }

    cancel(): void {
        this.canceled = true;
    }
}
