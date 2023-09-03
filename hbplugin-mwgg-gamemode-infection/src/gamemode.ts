import {
    EndGameIntent,
    EventListener,
    GameOverReason,
    HindenburgPlugin,
    PlayerLeaveEvent,
    PreventLoad,
    Room,
    RoomEndGameIntentEvent,
    RoomGameStartEvent
} from "@skeldjs/hindenburg";

import {
    AnyKillDistance,
    BaseGamemodePlugin,
    DeadBodySpawnEvent,
    DefaultRoomCategoryName,
    DefaultRoomOptionName,
    EndGameScreen,
    GamemodePlugin,
    GamemodeRolesAssignedEvent,
    MouthwashEndGames,
    RegisterRole,
    RoleAlignment,
} from "hbplugin-mouthwashgg-api";

import { EnumValue, GameOption, HudItem, NumberValue, Palette, Priority, WinSound } from "mouthwash-types";

import { Infected, Uninfected, infectedColor, uninfectedColor } from "./roles";

export type InfectionSpawnLocations = "Default"|"Reactor";

export const InfectionOptionName = {
    SpawnLocation: "Spawn Location",
    UninfectedSpeed: `${uninfectedColor.text("Uninfected")} Speed`,
    InitialInfectedCount: `Initial ${infectedColor.text("Infected")} Count`,
    InfectCooldown: "Infect Cooldown",
    InfectDistance: "Infect Distance",
    InfectedSpeed: `${infectedColor.text("Infected")} Speed`
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

        defaultOptions.set(InfectionOptionName.SpawnLocation, new GameOption(DefaultRoomCategoryName.Config, InfectionOptionName.SpawnLocation, new EnumValue<InfectionSpawnLocations>([ "Default", "Reactor" ], 0), Priority.E));
        defaultOptions.set(InfectionOptionName.UninfectedSpeed, new GameOption(DefaultRoomCategoryName.CrewmateRoles, InfectionOptionName.UninfectedSpeed, new NumberValue(1.25, 0.25, 0.25, 3, false, "{0}x"), Priority.F));
        defaultOptions.set(InfectionOptionName.InitialInfectedCount, new GameOption(DefaultRoomCategoryName.ImpostorRoles, InfectionOptionName.InitialInfectedCount, new NumberValue(1, 1, 1, 3, false, "{0} Infected"), Priority.G));
        defaultOptions.set(InfectionOptionName.InfectCooldown, new GameOption(DefaultRoomCategoryName.ImpostorRoles, InfectionOptionName.InfectCooldown, new NumberValue(10, 2.5, 0, 60, false, "{0}s"), Priority.G + 1));
        defaultOptions.set(InfectionOptionName.InfectDistance, new GameOption(DefaultRoomCategoryName.ImpostorRoles, InfectionOptionName.InfectDistance, new EnumValue<AnyKillDistance>(["Really Short", "Short", "Medium", "Long"], 1), Priority.G + 2));
        defaultOptions.set(InfectionOptionName.InfectedSpeed, new GameOption(DefaultRoomCategoryName.ImpostorRoles, InfectionOptionName.InfectedSpeed, new NumberValue(1.25, 0.25, 0.25, 3, false, "{0}x"), Priority.G + 3));

        return defaultOptions;
    }

    getAdjustedImpostorCount(): number {
        return this.api.roleService.adjustImpostorCount(
            this.api.gameOptions.gameOptions.get(InfectionOptionName.InitialInfectedCount)?.getValue<NumberValue>().value ?? 2
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

    @EventListener("mwgg.gamemode.rolesassigned")
    async onRolesAssigned(ev: GamemodeRolesAssignedEvent) {
        this.api.hudService.setHudItemVisibility(HudItem.CallMeetingButton, false);
        this.api.hudService.setHudItemVisibility(HudItem.ReportButton, false);
    }

    @EventListener("mwgg.deadbody.spawn")
    async onDeadBodySpawn(ev: DeadBodySpawnEvent) {
        ev.cancel();
    }

    @EventListener("room.gamestart")
    async onGameStart(ev: RoomGameStartEvent) {
        
    }

    @EventListener("player.leave") 
    async onPlayerLeave(ev: PlayerLeaveEvent) {
        for (const [ , player ] of this.room.players) {
            const playerRole = this.api.roleService.getPlayerRole(player);
            if (playerRole && !(playerRole instanceof Infected)) {
                return;
            }
        }
        
        const players = this.api.getEndgamePlayers();
        this.room.registerEndGameIntent(
            new EndGameIntent(
                "crewmates disconnected",
                GameOverReason.HumansDisconnect,
                {
                    endGameScreen: new Map(players.map<[number, EndGameScreen]>(player => {
                        return [
                            player.playerId,
                            {
                                titleText: player.isImpostor ? "Victory" : Palette.impostorRed.text("Defeat"),
                                subtitleText: `${uninfectedColor.text("Crewmates")} disconnected`,
                                backgroundColor: Palette.impostorRed,
                                yourTeam: RoleAlignment.Impostor,
                                winSound: WinSound.ImpostorWin,
                                hasWon: player.isImpostor
                            }
                        ];
                    }))
                }
            )
        );
    }

    @EventListener("room.endgameintent")
    async onEndGameIntent(ev: RoomEndGameIntentEvent<Room>) {
        if (ev.intentName === MouthwashEndGames.CrewmatesCompletedTasks) {
            ev.cancel();
            
            const players = this.api.getEndgamePlayers();
            this.room.registerEndGameIntent(
                new EndGameIntent(
                    "crewmates complete tasks",
                    GameOverReason.HumansByTask,
                    {
                        endGameScreen: new Map(players.map<[number, EndGameScreen]>(player => {
                            return [
                                player.playerId,
                                {
                                    titleText: !player.isImpostor ? "Victory" : Palette.impostorRed.text("Defeat"),
                                    subtitleText: `The ${uninfectedColor.text("Crewmates")} completed all of their tasks`,
                                    backgroundColor: Palette.crewmateBlue,
                                    winSound: WinSound.CrewmateWin,
                                    hasWon: !player.isImpostor
                                }
                            ];
                        }))
                    }
                )
            );
        } else if (ev.intentName === MouthwashEndGames.ImpostorsDisconnected) {
            ev.cancel();

            const players = this.api.getEndgamePlayers();
            this.room.registerEndGameIntent(
                new EndGameIntent(
                    "infected disconnected",
                    GameOverReason.ImpostorDisconnect,
                    {
                        endGameScreen: new Map(players.map<[number, EndGameScreen]>(player => {
                            return [
                                player.playerId,
                                {
                                    titleText: !player.isImpostor ? "Victory" : Palette.impostorRed.text("Defeat"),
                                    subtitleText: `${infectedColor.text("Infected")} disconnected`,
                                    backgroundColor: Palette.crewmateBlue,
                                    yourTeam: RoleAlignment.Crewmate,
                                    winSound: WinSound.CrewmateWin,
                                    hasWon: !player.isImpostor
                                }
                            ];
                        }))
                    }
                )
            );
        } else if (ev.intentName === MouthwashEndGames.CrewmatesDisconnected) {
            ev.cancel(); // this end-game intent needs to be registered when there is exactly _0_ crewmates left. 
        }
    }
}