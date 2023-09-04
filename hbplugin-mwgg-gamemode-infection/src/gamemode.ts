import {
    EndGameIntent,
    EventListener,
    GameMap,
    GameOverReason,
    HindenburgPlugin,
    PlayerData,
    PlayerLeaveEvent,
    PreventLoad,
    Room,
    RoomEndGameIntentEvent,
    RpcMessage,
    Vector2
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

import {
    BooleanValue,
    EnumValue,
    GameOption,
    HudItem,
    NumberValue,
    Palette,
    Priority,
    SetPlayerSpeedModifierMessage,
    WinSound
} from "mouthwash-types";

import { Infected, Uninfected, infectedColor, uninfectedColor } from "./roles";

export type InfectionSpawnLocations = "Default"|"Reactor";

export const InfectionOptionName = {
    SpawnLocation: "Spawn Location",
    UninfectedCloseDoors: `${uninfectedColor.text("Crewmates")} Close Doors`,
    UninfectedSpeed: `${uninfectedColor.text("Crewmates")} Speed`,
    InitialInfectedCount: `Initial ${infectedColor.text("Infected")} Count`,
    InfectCooldown: "Infect Cooldown",
    InfectDistance: "Infect Distance",
    InfectedSpeed: `${infectedColor.text("Infected")} Speed`,
    InfectedCloseDoors: `${infectedColor.text("Infected")} Close Doors`
} as const;

const infectedMapSpawnPositions: Record<GameMap, Vector2[]> = {
    [GameMap.TheSkeld]: [ new Vector2(-20.28, -5.29), new Vector2(-21.44, -3.96), new Vector2(-20.28, -6.62) ],
    [GameMap.AprilFoolsTheSkeld]: [ new Vector2(20.28, -5.29), new Vector2(21.44, -3.96), new Vector2(20.28, -6.62) ],
    [GameMap.Polus]: [ new Vector2(33.35, -6.12), new Vector2(36.31, -6.12), new Vector2(33.35, -7.92), new Vector2(36.31, -7.92) ],
    [GameMap.MiraHQ]: [ new Vector2(1.67, 11.33), new Vector2(2.59, 11.33), new Vector2(3.51, 11.33) ],
    [GameMap.Airship]: [ ]
};

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

        // defaultOptions.set(InfectionOptionName.SpawnLocation, new GameOption(DefaultRoomCategoryName.Config, InfectionOptionName.SpawnLocation, new EnumValue<InfectionSpawnLocations>([ "Default", "Reactor" ], 0), Priority.E));
        defaultOptions.set(InfectionOptionName.UninfectedSpeed, new GameOption(DefaultRoomCategoryName.CrewmateRoles, InfectionOptionName.UninfectedSpeed, new NumberValue(1.25, 0.25, 0.25, 3, false, "{0}x"), Priority.F));
        defaultOptions.set(InfectionOptionName.UninfectedCloseDoors, new GameOption(DefaultRoomCategoryName.CrewmateRoles, InfectionOptionName.UninfectedCloseDoors, new BooleanValue(false), Priority.F + 1));
        defaultOptions.set(InfectionOptionName.InitialInfectedCount, new GameOption(DefaultRoomCategoryName.ImpostorRoles, InfectionOptionName.InitialInfectedCount, new NumberValue(1, 1, 1, 3, false, "{0} Infected"), Priority.G));
        defaultOptions.set(InfectionOptionName.InfectCooldown, new GameOption(DefaultRoomCategoryName.ImpostorRoles, InfectionOptionName.InfectCooldown, new NumberValue(10, 2.5, 0, 60, false, "{0}s"), Priority.G + 1));
        defaultOptions.set(InfectionOptionName.InfectDistance, new GameOption(DefaultRoomCategoryName.ImpostorRoles, InfectionOptionName.InfectDistance, new EnumValue<AnyKillDistance>(["Really Short", "Short", "Medium", "Long"], 1), Priority.G + 2));
        defaultOptions.set(InfectionOptionName.InfectedSpeed, new GameOption(DefaultRoomCategoryName.ImpostorRoles, InfectionOptionName.InfectedSpeed, new NumberValue(1.25, 0.25, 0.25, 3, false, "{0}x"), Priority.G + 3));
        defaultOptions.set(InfectionOptionName.InfectedCloseDoors, new GameOption(DefaultRoomCategoryName.CrewmateRoles, InfectionOptionName.InfectedCloseDoors, new BooleanValue(false), Priority.G + 4));

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
    
    getSpawnPosition(nonInfectedCount: number, isInfected: boolean, idx: number) {
        if (!this.room.shipStatus)
            return undefined;

        if (isInfected) {
            const infectedSpawnPositions = infectedMapSpawnPositions[this.room.settings.map];
            if (infectedSpawnPositions.length === 0) return undefined;

            return infectedSpawnPositions[idx % infectedSpawnPositions.length];
        }

        return Vector2.up
            .rotateDeg((idx - 1) * (360 / nonInfectedCount))
            .mul(this.room.shipStatus.spawnRadius)
            .add(this.room.shipStatus.initialSpawnCenter)
            .add(new Vector2(0, 0.3636));
    }

    @EventListener("mwgg.gamemode.rolesassigned")
    async onRolesAssigned(ev: GamemodeRolesAssignedEvent) {
        this.api.hudService.setHudItemVisibility(HudItem.CallMeetingButton, false);
        this.api.hudService.setHudItemVisibility(HudItem.ReportButton, false);
        this.api.hudService.setHudItemVisibility(HudItem.MapSabotageButtons, false);
        this.api.hudService.setHudItemVisibility(HudItem.VentButton, false);

        const infectedSpeed = this.api.gameOptions.gameOptions.get(InfectionOptionName.InfectedSpeed)?.getValue<NumberValue>().value || 1.25;
        const uninfectedSpeed = this.api.gameOptions.gameOptions.get(InfectionOptionName.UninfectedSpeed)?.getValue<NumberValue>().value || 1.25;
        
        const playersUninfected: PlayerData<Room>[] = [];
        const playersInfected: PlayerData<Room>[] = [];
        for (const [ , player ] of this.room.players) {
            const playerRole = this.api.roleService.getPlayerRole(player);
            if (playerRole instanceof Infected) {
                playersInfected.push(player);
            } else if (playerRole instanceof Uninfected) {
                playersUninfected.push(player);
            }
        }

        await this.room.broadcastMessages(
            [
                ...playersInfected.map(infectedPlayer => {
                    return new RpcMessage(
                        infectedPlayer.control!.netId,
                        new SetPlayerSpeedModifierMessage(infectedSpeed)
                    );
                }),
                ...playersUninfected.map(uninfectedPlayer => {
                    return new RpcMessage(
                        uninfectedPlayer.control!.netId,
                        new SetPlayerSpeedModifierMessage(uninfectedSpeed)
                    );
                })
            ]
        );

        const canUninfectedCloseDoors = this.api.gameOptions.gameOptions.get(InfectionOptionName.UninfectedCloseDoors)?.getValue<BooleanValue>().enabled || false;
        const canInfectedCloseDoors = this.api.gameOptions.gameOptions.get(InfectionOptionName.InfectedCloseDoors)?.getValue<BooleanValue>().enabled || false;
        
        if (canUninfectedCloseDoors) this.api.hudService.setHudItemVisibilityFor(HudItem.MapDoorButtons, canUninfectedCloseDoors, playersUninfected);
        if (canInfectedCloseDoors) this.api.hudService.setHudItemVisibilityFor(HudItem.MapDoorButtons, canInfectedCloseDoors, playersInfected);
        const spawnLocation = this.api.gameOptions.gameOptions.get(InfectionOptionName.SpawnLocation)?.getValue<EnumValue<InfectionSpawnLocations>>();
        // if (spawnLocation?.selectedOption === "Reactor" ) {
            setTimeout(() => {
                for (let i = 0; i < playersUninfected.length; i++) {
                    const player = playersUninfected[i];
                    const position = this.getSpawnPosition(playersUninfected.length, false, i);
                    if (position === undefined) continue;
    
                    const playerTransform = player.transform;
                    if (playerTransform) {
                        player.transform.seqId += 5;
                        player.transform.snapTo(position);
                    }
                }
                for (let i = 0; i < playersInfected.length; i++) {
                    const player = playersInfected[i];
                    const position = this.getSpawnPosition(playersInfected.length, true, i);
                    if (position === undefined) continue;
    
                    const playerTransform = player.transform;
                    if (playerTransform) {
                        player.transform.seqId += 5;
                        player.transform.snapTo(position);
                    }
                }
            }, 5000);
        // }
    }

    @EventListener("mwgg.deadbody.spawn")
    async onDeadBodySpawn(ev: DeadBodySpawnEvent) {
        ev.cancel();
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