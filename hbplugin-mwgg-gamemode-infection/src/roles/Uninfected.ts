import {
    PlayerData,
    Room
} from "@skeldjs/hindenburg";

import {
    BaseRole,
    EmojiService,
    MouthwashRole,
    RoleAlignment,
    RoleObjective
} from "hbplugin-mouthwashgg-api";

import { Palette } from "mouthwash-types";

const crewmateColor = Palette.crewmateBlue;

export const CrewmateOptionName = {

} as const;

@MouthwashRole("Crewmate", RoleAlignment.Crewmate, crewmateColor, EmojiService.getEmoji("crewmate"))
@RoleObjective("Run from the infected, and complete your tasks!")
export class Uninfected extends BaseRole {
    constructor(
        public readonly player: PlayerData<Room>
    ) {
        super(player);
    }

    async onReady() {
        // allow all players to see the emoji to identify non-infected
        await this.api.nameService.removeEmojiFor(this.player, this.metadata.emoji, [ this.player ]);
        await this.api.nameService.addEmoji(this.player, this.metadata.emoji);
    }

    async onRemove() {}
}