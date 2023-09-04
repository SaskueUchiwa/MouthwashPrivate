import {
    EndGameIntent,
    GameOverReason,
    PlayerData,
    PlayerMurderEvent,
    Room,
    RpcMessage
} from "@skeldjs/hindenburg";

import {
    AnyKillDistance,
    AssetReference,
    EmojiService,
    EndGameScreen,
    Impostor,
    MouthwashRole,
    RoleAlignment,
    RoleAssignment,
    RoleObjective,
    RoleStringNames,
    StartGameScreen,
    killDistanceToRange
} from "hbplugin-mouthwashgg-api";

import { AnticheatExceptions, InfractionName } from "hbplugin-mouthwashgg-anti-cheat";

import {
    BooleanValue,
    EnumValue,
    HudItem,
    HudLocation,
    KeyCode,
    NumberValue,
    Palette,
    Priority,
    RGBA,
    SetPlayerSpeedModifierMessage,
    WinSound
} from "mouthwash-types";
import { uninfectedColor } from "./Uninfected";
import { InfectionOptionName } from "../gamemode";

export const infectedColor = new RGBA(255, 25, 25, 255);

@MouthwashRole("Infected", RoleAlignment.Impostor, infectedColor, EmojiService.getEmoji("impostor"))
@RoleObjective("Infect the crewmates!")
@AnticheatExceptions([ InfractionName.ForbiddenRpcVent, InfractionName.ForbiddenRpcCloseDoors ])
export class Infected extends Impostor {
    getStartGameScreen(playerRoles: RoleAssignment[], zombieCount: number): StartGameScreen {
        const crewmateCount = playerRoles.filter(roleAssignment => {
            return roleAssignment.role.metadata.alignment === RoleAlignment.Crewmate;
        }).length;
        
        const subtitleText = crewmateCount === 1
            ? `Hunting down ${crewmateCount} ${Palette.crewmateBlue.text("Crewmates")}`
            : `Hunting down ${crewmateCount} ${Palette.crewmateBlue.text("Crewmates")}`;

        return {
            titleText: "Infected",
            subtitleText: subtitleText,
            backgroundColor: Palette.impostorRed,
            teamPlayers: RoleAlignment.Impostor
        };
    }

    protected _infectedSpeed: number;

    constructor(public readonly player: PlayerData<Room>) {
        super(player);

        this._infectedSpeed = this.api.gameOptions.gameOptions.get(InfectionOptionName.InfectedSpeed)?.getValue<NumberValue>().value || 1.25;
        this._killRange = killDistanceToRange[this.api.gameOptions.gameOptions.get(InfectionOptionName.InfectDistance)?.getValue<EnumValue<AnyKillDistance>>().selectedOption || "Short"];
        this._killCooldown = this.api.gameOptions.gameOptions.get(InfectionOptionName.InfectCooldown)?.getValue<NumberValue>().value || 10;
    }

    async onReady() {
        await this.markImpostor();

        this._killButton = await this.spawnButton(
            "kill-button",
            new AssetReference("PggResources/Global", "Assets/Mods/OfficialAssets/KillButton.png"),
            {
                maxTimer: this._killCooldown,
                currentTime: 20,
                isCountingDown: true,
                keys: [ KeyCode.Q ]
            }
        );

        this._killButton?.on("mwgg.button.click", async ev => {
            if (!this._killButton || !this.isKillButtonEnabled() || this._killButton.currentTime > 0 || !this._killTarget || this.player.info?.isDead)
                return;

            if (this._killTarget.transform) {
                this.player.transform?.snapTo(this._killTarget.transform.position);
            }
            await this.quietMurder(this._killTarget);
            if (await this.checkForAllInfectedEndGame(this._killTarget))
                return;

            this._killTarget.info?.setDead(false);
            const originaRole = this.api.roleService.getPlayerRole(this._killTarget);
            const previousEmoji = originaRole?.metadata.emoji || EmojiService.getEmoji("crewmate");
            await this.api.roleService.removeRole(this._killTarget);
            const role = await this.api.roleService.assignRole(this._killTarget, Infected);
            this.api.hudService.setHudStringFor(
                HudLocation.TaskText,
                RoleStringNames.TaskObjective,
                `${infectedColor.text("Role: Zombie\nYou've been infected! Go find other crewmates\nto spread the infection!")}`,
                Priority.A,
                [ role.player ]
            );
            await this.api.nameService.removeEmoji(this._killTarget, previousEmoji);
            await this.room.broadcastMessages(
                [
                    new RpcMessage(
                        this._killTarget.control!.netId,
                        new SetPlayerSpeedModifierMessage(this._infectedSpeed)
                    )
                ]
            );
            // we probably dont need to add the emoji, as it's done in Infected.onReady
            // this.api.nameService.addEmojiFor(role.player, role.metadata.emoji, [ role.player ]);
            await role.onReady();
        });

        // allow all players to see the emoji to identify infected
        await this.api.nameService.removeEmojiFor(this.player, this.metadata.emoji, [ this.player ]);
        await this.api.nameService.addEmoji(this.player, this.metadata.emoji);
    }

    async onRemove() {}
    
    async patchMurderPlayer(murderer: PlayerData<Room>, victim: PlayerData<Room>) {
        const murdererPlayerControl = murderer.control;
        const victimPlayerControl = victim.control;
        if (murdererPlayerControl === undefined || victimPlayerControl === undefined)
            return;

        const victimPlayerId = victim.playerId;
        if (victimPlayerId === undefined)
            return;

        // this method is overridden to remove player.die event being called (via patchMurderPlayer),
        // see MouthwashApiPlugin.onPlayerDie
        // victim.control?.kill("murder");
        await murderer.emit(new PlayerMurderEvent(this.room, murderer, undefined, victim));
        murdererPlayerControl["_rpcMurderPlayer"](victim);
        murdererPlayerControl["_checkMurderEndGame"](victim);
    }

    async checkForAllInfectedEndGame(finalTarget: PlayerData<Room>) {
        for (const [ , player ] of this.room.players) {
            if (player === finalTarget)
                continue;
            
            const playerRole = this.api.roleService.getPlayerRole(player);
            if (playerRole && !(playerRole instanceof Infected)) {
                return false;
            }
        }

        const players = this.api.getEndgamePlayers();
        this.room.registerEndGameIntent(
            new EndGameIntent(
                "crewmates infected",
                GameOverReason.ImpostorByKill,
                {
                    endGameScreen: new Map(players.map<[number, EndGameScreen]>(player => {
                        return [
                            player.playerId,
                            {
                                titleText: player.isImpostor ? "Victory" : Palette.impostorRed.text("Defeat"),
                                subtitleText: `${uninfectedColor.text("Crewmates")} were infected`,
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
        return true;
    }
}