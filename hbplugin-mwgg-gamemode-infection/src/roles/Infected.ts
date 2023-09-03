import {
    PlayerData,
    PlayerMurderEvent,
    Room
} from "@skeldjs/hindenburg";

import {
    AssetReference,
    EmojiService,
    Impostor,
    MouthwashRole,
    RoleAlignment,
    RoleAssignment,
    RoleObjective,
    RoleStringNames,
    StartGameScreen
} from "hbplugin-mouthwashgg-api";

import { AnticheatExceptions, InfractionName } from "hbplugin-mouthwashgg-anti-cheat";

import {
    HudLocation,
    KeyCode,
    Palette,
    Priority,
    RGBA
} from "mouthwash-types";

export const zombieColor = new RGBA(255, 25, 25, 255);

export const ZombieOptionName = {

} as const;

@MouthwashRole("Infected", RoleAlignment.Impostor, zombieColor, EmojiService.getEmoji("impostor"))
@RoleObjective("Infect the crewmates!")
@AnticheatExceptions([ InfractionName.ForbiddenRpcVent ])
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

    async onReady() {
        await this.giveFakeTasks();

        this._killButton = await this.spawnButton(
            "kill-button",
            new AssetReference("PggResources/Global", "Assets/Mods/OfficialAssets/KillButton.png"),
            {
                maxTimer: this._killCooldown,
                currentTime: 10,
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
            await this.patchMurderPlayer(this.player, this._killTarget);
            this._killTarget.info?.setDead(false);
            const originaRole = this.api.roleService.getPlayerRole(this._killTarget);
            const previousEmoji = originaRole?.metadata.emoji || EmojiService.getEmoji("crewmate");
            await this.api.roleService.removeRole(this._killTarget);
            const role = await this.api.roleService.assignRole(this._killTarget, Infected);
            this.api.hudService.setHudStringFor(
                HudLocation.TaskText,
                RoleStringNames.TaskObjective,
                `${zombieColor.text("Role: Zombie\nYou've been infected! Go find other crewmates\nto spread the infection!")}`,
                Priority.A,
                [ role.player ]
            );
            await this.api.nameService.removeEmoji(this._killTarget, previousEmoji);
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
}