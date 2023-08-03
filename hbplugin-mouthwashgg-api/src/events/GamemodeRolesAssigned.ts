import { BasicEvent } from "@skeldjs/events";

export class GamemodeRolesAssignedEvent extends BasicEvent {
    static eventName = "mwgg.gamemode.rolesassigned" as const;
    eventName = "mwgg.gamemode.rolesassigned" as const;

    constructor() {
        super();
    }
}