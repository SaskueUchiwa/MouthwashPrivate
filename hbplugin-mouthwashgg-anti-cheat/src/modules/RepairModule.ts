import {
    AutoDoorsSystem,
    CloseDoorsOfTypeMessage,
    Connection,
    DeconState,
    DeconSystem,
    DoorsSystem,
    ElectricalDoorsSystem,
    EventTarget,
    HeliSabotageSystem,
    HeliSabotageSystemRepairTag,
    HqHudSystem,
    HqHudSystemRepairTag,
    HudOverrideSystem,
    LifeSuppSystem,
    MedScanSystem,
    MovingPlatformSystem,
    ReactorSystem,
    RepairSystemMessage,
    SabotageSystem,
    SecurityCameraSystem,
    SwitchSystem,
    SystemType
} from "@skeldjs/hindenburg";
import { InfractionSeverity, MouthwashAntiCheatPlugin } from "../plugin";
import { InfractionName } from "../enums";

export class RepairModule extends EventTarget {
    constructor(public readonly plugin: MouthwashAntiCheatPlugin) {
        super();
    }

    async onCloseDoorsOfType(sender: Connection, closeDoorsOfTypeMessage: CloseDoorsOfTypeMessage) {

    }

    async onRepairSystem(sender: Connection, repairSystemMessage: RepairSystemMessage) {
        console.log("Got %s from %s", repairSystemMessage, sender);

        const repairingPlayer = this.plugin.room.getPlayerByNetId(repairSystemMessage.netId);
        if (repairingPlayer === undefined || repairingPlayer.clientId !== sender.clientId) {
            if (repairSystemMessage.systemId === SystemType.Sabotage) {
                return this.plugin.createInfraction(sender, InfractionName.FalseRpcSabotage,
                    { playerNetID: repairSystemMessage.netId, systemId: repairSystemMessage.amount }, InfractionSeverity.Critical);
            }
            
            return this.plugin.createInfraction(sender, InfractionName.FalseRpcRepair,
                { playerNetID: repairSystemMessage.netId, systemId: repairSystemMessage.systemId, repairAmount: repairSystemMessage.amount }, InfractionSeverity.Critical);
        }
            
        if (!this.plugin.room.shipStatus)
            return this.plugin.createInfraction(sender, InfractionName.InvalidRpcSabotage,
                { systemId: repairSystemMessage.amount, inLobby: true }, InfractionSeverity.High);

        if (repairSystemMessage.systemId === SystemType.Sabotage) {
            const defaultInfraction = this.plugin.createInfraction(sender, InfractionName.ForbiddenRpcSabotage,
                { systemId: repairSystemMessage.amount }, InfractionSeverity.Critical);
            if (defaultInfraction) return defaultInfraction;

            const systemSabotage = this.plugin.room.shipStatus.systems.get(repairSystemMessage.amount);
            if (systemSabotage === undefined)
                return this.plugin.createInfraction(sender, InfractionName.InvalidRpcSabotage,
                    { systemId: repairSystemMessage.amount }, InfractionSeverity.High);

            if (this.plugin.room.meetingHud)
                return this.plugin.createInfraction(sender, InfractionName.InvalidRpcSabotage,
                    { systemId: repairSystemMessage.amount, inMeeting: true }, InfractionSeverity.High);
                
            const sabotageSystem = this.plugin.room.shipStatus.systems.get(SystemType.Sabotage) as SabotageSystem|undefined;
            if (!sabotageSystem) {
                this.plugin.logger.warn("Couldn't apply anti-cheat rules for sabotage (repair module): no sabotage system on ship status?");
                return;
            }

            if (sabotageSystem.cooldown > 0.5) {
                return this.plugin.createInfraction(sender, InfractionName.RateLimitedRpcSabotage,
                    { systemId: repairSystemMessage.amount }, sabotageSystem.cooldown < 10 ? InfractionSeverity.Low : InfractionSeverity.Medium);
            }

            const currentlySabotaged = [...this.plugin.room.shipStatus.systems.values()].find(system => system.sabotaged);
            if (currentlySabotaged) {
                return this.plugin.createInfraction(sender, InfractionName.RateLimitedRpcSabotage,
                    { systemId: repairSystemMessage.amount, currentlySabotagedSystemId: currentlySabotaged.systemType },
                    InfractionSeverity.Medium);
            }

            return;
        }
        
        // const defaultInfraction = this.plugin.createInfraction(sender, InfractionName.ForbiddenRpcRepair,
        //     { systemId: repairSystemMessage.systemId, repairAmount: repairSystemMessage.amount }, InfractionSeverity.Critical);
        // if (defaultInfraction) return defaultInfraction;

        const system = this.plugin.room.shipStatus.systems.get(repairSystemMessage.systemId);
        if (system === undefined)
            return this.plugin.createInfraction(sender, InfractionName.InvalidRpcRepair,
                { systemId: repairSystemMessage.systemId, repairAmount: repairSystemMessage.amount }, InfractionSeverity.High);

        // https://github.com/SkeldJS/SkeldJS/tree/691e1b04b1b3a7c053d123bc29f6c02eff1e479e/packages/core/lib/systems
        // TODO: check player positions
        if (system instanceof AutoDoorsSystem) {
            return this.plugin.createInfraction(sender, InfractionName.InvalidRpcRepair,
                { systemId: repairSystemMessage.systemId, repairAmount: repairSystemMessage.amount }, InfractionSeverity.High);
        } else if (system instanceof DeconSystem) {
            if (system.state !== DeconState.Idle) {
                return this.plugin.createInfraction(sender, InfractionName.InvalidRpcOpenDecon,
                    { deconState: system.state, repairAmount: repairSystemMessage.amount }, InfractionSeverity.Low);
            }
            switch (repairSystemMessage.amount) {
                case 1: // enter heading up
                    break;
                case 2: // enter heading down
                    break;
                case 3: // exit heading up
                    break;
                case 4: // exit heading down
                    break;
            }
        } else if (system instanceof DoorsSystem) {
            const doorId = repairSystemMessage.amount & 0x1f;

            if (doorId >= system.doors.length) {
                return this.plugin.createInfraction(sender, InfractionName.InvalidRpcOpenDecon,
                    { doorId }, InfractionSeverity.Low);
            }

            const door = system.doors[doorId];
            if (door.isOpen) {
                return this.plugin.createInfraction(sender, InfractionName.InvalidRpcOpenDoor,
                    { doorId, isOpen: true }, InfractionSeverity.Medium);
            }
        } else if (system instanceof ElectricalDoorsSystem) {
            return this.plugin.createInfraction(sender, InfractionName.InvalidRpcRepair,
                { systemId: repairSystemMessage.systemId, repairAmount: repairSystemMessage.amount }, InfractionSeverity.High);
        } else if (system instanceof HeliSabotageSystem) {
            if (!system.sabotaged) {
                return this.plugin.createInfraction(sender, InfractionName.InvalidRpcRepair,
                    { systemId: repairSystemMessage.systemId, repairAmount: repairSystemMessage.amount, isRepaired: true }, InfractionSeverity.Medium);
            }

            const consoleId = repairSystemMessage.amount & 0xf;
            const repairOp = repairSystemMessage.amount & 0xf0;

            switch (repairOp) {
                case HeliSabotageSystemRepairTag.DeactiveBit:
                    console.log("[HELI] %s deactivated %s (active consoles %s, completed consoles %s, countdown %s, resetTimer %s)",
                        repairingPlayer, consoleId, system.activeConsoles, system.completedConsoles, system.countdown, system.resetTimer);
                    break;
                case HeliSabotageSystemRepairTag.ActiveBit:
                    console.log("[HELI] %s activated %s (active consoles %s, completed consoles %s, countdown %s, resetTimer %s)",
                        repairingPlayer, consoleId, system.activeConsoles, system.completedConsoles, system.countdown, system.resetTimer);
                    break;
                case HeliSabotageSystemRepairTag.DamageBit:
                    console.log("[HELI] %s damaged %s (active consoles %s, completed consoles %s, countdown %s, resetTimer %s)",
                        repairingPlayer, consoleId, system.activeConsoles, system.completedConsoles, system.countdown, system.resetTimer);
                    break;
                case HeliSabotageSystemRepairTag.FixBit:
                    console.log("[HELI] %s fixed %s (active consoles %s, completed consoles %s, countdown %s, resetTimer %s)",
                        repairingPlayer, consoleId, system.activeConsoles, system.completedConsoles, system.countdown, system.resetTimer);
                    break;
            }
        } else if (system instanceof HqHudSystem) {
            const consoleId = repairSystemMessage.amount & 0xf;
            const repairOperation = repairSystemMessage.amount & 0xf0;

            switch (repairOperation) {
                case HqHudSystemRepairTag.CompleteConsole:
                    console.log("[HQ HUD] %s completed %s (active consoles %s, completed consoles %s, timer %s)",
                        repairingPlayer, consoleId, system.activeConsoles, system.completedConsoles, system.timer);
                    break;
                case HqHudSystemRepairTag.CloseConsole:
                    console.log("[HQ HUD] %s closed %s (active consoles %s, completed consoles %s, timer %s)",
                        repairingPlayer, consoleId, system.activeConsoles, system.completedConsoles, system.timer);
                    break;
                case HqHudSystemRepairTag.OpenConsole:
                    console.log("[HQ HUD] %s open %s (active consoles %s, completed consoles %s, timer %s)",
                        repairingPlayer, consoleId, system.activeConsoles, system.completedConsoles, system.timer);
                    break;
            }
        } else if (system instanceof HudOverrideSystem) {
            if (!system.sabotaged) {
                return this.plugin.createInfraction(sender, InfractionName.InvalidRpcRepair,
                    { systemId: repairSystemMessage.systemId, repairAmount: repairSystemMessage.amount, isRepaired: true }, InfractionSeverity.Medium);
            }

            console.log("[HUD] repaired by %s", repairingPlayer);
        } else if (system instanceof LifeSuppSystem) {
            if (!system.sabotaged) {
                return this.plugin.createInfraction(sender, InfractionName.InvalidRpcRepair,
                    { systemId: repairSystemMessage.systemId, repairAmount: repairSystemMessage.amount, isRepaired: true }, InfractionSeverity.Medium);
            }

            const consoleId = repairSystemMessage.amount & 0x3;

            if (repairSystemMessage.amount & 0x40) { // repair console
                console.log("[O2] %s repaired %s (completed consoles %s, timer %s)", repairingPlayer, consoleId, system.completed, system.timer);
            } else if (repairSystemMessage.amount & 0x10) { // repair system
                console.log("[O2] %s repaired whole system (completed consoles %s, timer %s)", repairingPlayer, consoleId, system.completed, system.timer);
            }
        } else if (system instanceof MedScanSystem) {
            const playerId = repairSystemMessage.amount & 0x1f;

            if (repairSystemMessage.amount & 0x80) { // join queue
                console.log("[MED SCAN] %s (%s) added player id %s to queue (queue %s)",
                    repairingPlayer, repairingPlayer.playerId, playerId, system.queue);
            } else if (repairSystemMessage.amount & 0x40) { // leave queue
                console.log("[MED SCAN] %s (%s) removed player id %s from queue (queue %s)",
                    repairingPlayer, repairingPlayer.playerId, playerId, system.queue);
            }
        } else if (system instanceof MovingPlatformSystem) {
            return this.plugin.createInfraction(sender, InfractionName.InvalidRpcRepair,
                { systemId: repairSystemMessage.systemId, repairAmount: repairSystemMessage.amount }, InfractionSeverity.High);
        } else if (system instanceof ReactorSystem) {
            if (!system.sabotaged) {
                return this.plugin.createInfraction(sender, InfractionName.InvalidRpcRepair,
                    { systemId: repairSystemMessage.systemId, repairAmount: repairSystemMessage.amount, isRepaired: true }, InfractionSeverity.Medium);
            }

            const consoleId = repairSystemMessage.amount & 0x3;

            if (repairSystemMessage.amount & 0x40) { // place hand on console
                console.log("[REACTOR] %s placed hand on console %s (active consoles %s, timer %s)",
                    repairingPlayer, consoleId, system.completed, system.timer);
            } else if (repairSystemMessage.amount & 0x20) { // remove hand from console
                console.log("[REACTOR] %s removed hand from console %s (active consoles %s, timer %s)",
                    repairingPlayer, consoleId, system.completed, system.timer);
            } else if (repairSystemMessage.amount & 0x10) { // repair system
                console.log("[REACTOR] %s repaired whole system (active consoles %s, timer %s)",
                    repairingPlayer, system.completed, system.timer);
            }
        } else if (system instanceof SecurityCameraSystem) {
            if (repairSystemMessage.amount === 1) { // begin watching cameras
                console.log("[SECURITY] %s started watching cameras (players watching cameras %s)",
                    repairingPlayer, system.players);
            } else { // stop watching cameras
                console.log("[SECURITY] %s stopped watching cameras (players watching cameras %s)",
                    repairingPlayer, system.players);
            }
        } else if (system instanceof SwitchSystem) {
            if (!system.sabotaged) {
                return this.plugin.createInfraction(sender, InfractionName.InvalidRpcRepair,
                    { systemId: repairSystemMessage.systemId, repairAmount: repairSystemMessage.amount, isRepaired: true }, InfractionSeverity.Medium);
            }

            console.log("[SWITCHES] %s toggled switch %s (switches %s, expected %s, brightness %s)",
                repairingPlayer, repairSystemMessage.amount, system.actual, system.expected, system.brightness);
        } else {
            this.plugin.logger.warn("Got unhandled system type %s for repair from player %s (repair amount %s)",
                system.systemType, repairingPlayer, repairSystemMessage.amount);
        }
    }
}