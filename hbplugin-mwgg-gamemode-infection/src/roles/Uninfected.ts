import {
    PlayerData,
    Room
} from "@skeldjs/hindenburg";
import { AnticheatExceptions, InfractionName } from "hbplugin-mouthwashgg-anti-cheat";

import {
    BaseRole,
    EmojiService,
    MouthwashRole,
    RoleAlignment,
    RoleObjective
} from "hbplugin-mouthwashgg-api";

import { Palette } from "mouthwash-types";

export const uninfectedColor = Palette.crewmateBlue;

@MouthwashRole("Crewmate", RoleAlignment.Crewmate, uninfectedColor, EmojiService.getEmoji("crewmate"))
@RoleObjective("Run from the infected, and complete your tasks!")
@AnticheatExceptions([ InfractionName.ForbiddenRpcCloseDoors, InfractionName.ForbiddenRpcCompleteTask ])
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

        this.player.playerInfo?.setImpostor(true); // to give sabotage button
    }

    async onRemove() {}
}