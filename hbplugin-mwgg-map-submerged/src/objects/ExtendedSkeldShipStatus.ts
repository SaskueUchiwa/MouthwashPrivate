import {
    DoorsSystem,
    HazelReader,
    Hostable,
    HudOverrideSystem,
    MedScanSystem,
    ReactorSystem,
    SabotageSystem,
    SecurityCameraSystem,
    ShipStatusData,
    SkeldShipStatus,
    SpawnType,
    SwitchSystem,
    SystemStatus,
    SystemType
} from "@skeldjs/hindenburg";

import { SubmergedStatus } from "./SubmergedStatus";
import { SubmergedSystemType } from "../enums";
import {
    SpawnInState,
    SubmarineBoxCatSystem,
    SubmarineElevatorSystem,
    SubmarineOxygenSystem,
    SubmarinePlayerFloorSystem,
    SubmarineSecuritySabotageSystem,
    SubmarineSpawnInSystem
} from "../systems";

export class ExtendedSkeldShipStatus<RoomType extends Hostable<any>> extends SkeldShipStatus<RoomType> {
    submergedStatus: SubmergedStatus;

    constructor(
        room: RoomType,
        spawnType: SpawnType,
        netId: number,
        ownerid: number,
        flags: number,
        data?: HazelReader | ShipStatusData
    ) {
        super(room, spawnType, netId, ownerid, flags, data);

        this.submergedStatus = new SubmergedStatus(this);
    }

    Setup() {
        this.systems.set(SystemType.Communications, new HudOverrideSystem(this, SystemType.Communications, {
            sabotaged: false,
        }));

        this.systems.set(SystemType.Doors, new DoorsSystem(this, SystemType.Doors, {
            doors: [], // TODO
            cooldowns: new Map // TODO
        }));

        this.systems.set(SystemType.Electrical, new SwitchSystem(this, SystemType.Electrical, {
            actual: [ false, false, false, false, false ],
            expected: [ false, false, false, false, false ],
            brightness: 255
        }));

        this.systems.set(SystemType.MedBay, new MedScanSystem(this, SystemType.MedBay, {
            queue: []
        }));

        this.systems.set(SystemType.Reactor, new ReactorSystem(this, SystemType.Reactor, {
            timer: 10000,
            completed: new Set,
        }));

        this.systems.set(SystemType.Security, new SecurityCameraSystem(this, SystemType.Security, {
            players: new Set
        }));

        // this.systems.set(SystemType.Ventilation, ) TODO: Ventilation system

        this.systems.set(SubmergedSystemType.UpperCentral as number, new SubmarineOxygenSystem(this, SubmergedSystemType.UpperCentral as number, {
            countdown: 10000,
            playersWithMask: new Set,
            doKillCheck: false
        }));

        this.systems.set(SubmergedSystemType.ElevatorHallwayLeft as number, new SubmarineElevatorSystem(this, SubmergedSystemType.ElevatorHallwayLeft as number, {
            upperDeckIsTargetFloor: false,
            moving: false,
            tandemElevator: SubmergedSystemType.ElevatorHallwayRight
        }));

        this.systems.set(SubmergedSystemType.ElevatorHallwayRight as number, new SubmarineElevatorSystem(this, SubmergedSystemType.ElevatorHallwayRight as number, {
            upperDeckIsTargetFloor: true,
            moving: false,
            tandemElevator: SubmergedSystemType.ElevatorHallwayLeft
        }));

        this.systems.set(SubmergedSystemType.ElevatorLobbyLeft as number, new SubmarineElevatorSystem(this, SubmergedSystemType.ElevatorLobbyLeft as number, {
            upperDeckIsTargetFloor: true,
            moving: false,
            tandemElevator: SubmergedSystemType.ElevatorLobbyRight
        }));

        this.systems.set(SubmergedSystemType.ElevatorLobbyRight as number, new SubmarineElevatorSystem(this, SubmergedSystemType.ElevatorLobbyRight as number, {
            upperDeckIsTargetFloor: false,
            moving: false,
            tandemElevator: SubmergedSystemType.ElevatorLobbyLeft
        }));

        this.systems.set(SubmergedSystemType.ElevatorService as number, new SubmarineElevatorSystem(this, SubmergedSystemType.ElevatorService as number, {
            upperDeckIsTargetFloor: false,
            moving: false,
            tandemElevator: SubmergedSystemType.Nil
        }));

        this.systems.set(SubmergedSystemType.Floor as number, new SubmarinePlayerFloorSystem(this, SubmergedSystemType.Floor as number, {
            playerFloors: new Map
        }));

        this.systems.set(SubmergedSystemType.SecuritySabotage as number, new SubmarineSecuritySabotageSystem(this, SubmergedSystemType.SecuritySabotage as number, {
            fixedCameras: [ 0, 1, 2, 3, 4, 5, 6 ]
        }));

        this.systems.set(SubmergedSystemType.SpawnIn as number, new SubmarineSpawnInSystem(this, SubmergedSystemType.SpawnIn as number, {
            players: new Set,
            currentState: SpawnInState.Spawning,
            timer: 10
        }));

        this.systems.set(SubmergedSystemType.BoxCat as number, new SubmarineBoxCatSystem(this, SubmergedSystemType.BoxCat as number, {
            position: 0
        }));

        this.systems.set(SystemType.Sabotage, new SabotageSystem(this, SystemType.Sabotage, {
            cooldown: 0
        }));
    }
}