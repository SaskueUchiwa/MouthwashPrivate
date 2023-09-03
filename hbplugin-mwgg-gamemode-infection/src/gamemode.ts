import {
    EventListener,
    HindenburgPlugin,
    PreventLoad
} from "@skeldjs/hindenburg";

import {
    BaseGamemodePlugin,
    Crewmate,
    DeadBodySpawnEvent,
    DefaultRoomCategoryName,
    DefaultRoomOptionName,
    GamemodePlugin,
    RegisterRole,
} from "hbplugin-mouthwashgg-api";
import { Infected, Uninfected, zombieColor } from "./roles";
import { GameOption, NumberValue, Priority } from "mouthwash-types";

export const InfectionOptionName = {
    InitialZombies: `Initial ${zombieColor.text("Zombies")}`
} as const;

@PreventLoad
@GamemodePlugin({
    id: "infection",
    name: "Infection",
    version: "1.0.0",
    description: "There's been an outbreak on-board. Complete your tasks and don't get infected!",
    author: "weakeyes"
})
@RegisterRole(Infected)
@RegisterRole(Uninfected)
@HindenburgPlugin("hbplugin-mwgg-gamemode-infection", "1.0.0", "none")
export class InfectionGamemodePlugin extends BaseGamemodePlugin {
    getGameOptions() {
        const defaultOptions = this.api.createDefaultOptions();
        defaultOptions.delete(DefaultRoomOptionName.ImpostorVision);
        defaultOptions.delete(DefaultRoomOptionName.CrewmateVision);
        defaultOptions.delete(DefaultRoomOptionName.ImpostorKillDistance);
        defaultOptions.delete(DefaultRoomOptionName.PlayerSpeed);
        defaultOptions.delete(DefaultRoomOptionName.AnonymousVotes);
        defaultOptions.delete(DefaultRoomOptionName.ConfirmEjects);
        defaultOptions.delete(DefaultRoomOptionName.EmergencyCooldown);
        defaultOptions.delete(DefaultRoomOptionName.EmergencyMeetings);
        defaultOptions.delete(DefaultRoomOptionName.DiscussionTime);
        defaultOptions.delete(DefaultRoomOptionName.VotingTime);
        defaultOptions.delete(DefaultRoomOptionName.ImpostorKillCooldown);
        defaultOptions.delete(DefaultRoomOptionName.ImpostorCount);

        defaultOptions.set(InfectionOptionName.InitialZombies, new GameOption(DefaultRoomCategoryName.ImpostorRoles, InfectionOptionName.InitialZombies, new NumberValue(1, 1, 1, 3, false, "{0} Zombies"), Priority.F));
        
        return defaultOptions;
    }

    getAdjustedImpostorCount(): number {
        return this.api.roleService.adjustImpostorCount(
            this.api.gameOptions.gameOptions.get(InfectionOptionName.InitialZombies)?.getValue<NumberValue>().value ?? 2
        );
    }

    getRoleCounts() {
        const impostorCount = this.getAdjustedImpostorCount();
        return [
            {
                role: Infected,
                playerCount: impostorCount
            },
            {
                role: Uninfected,
                playerCount: this.room.players.size - impostorCount
            }
        ];
    }

    @EventListener("mwgg.deadbody.spawn")
    async onDeadBodySpawn(ev: DeadBodySpawnEvent) {
        ev.cancel();
    }
}