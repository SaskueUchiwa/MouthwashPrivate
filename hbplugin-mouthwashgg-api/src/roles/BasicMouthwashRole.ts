import { BaseRole, Hostable, RoleTeamType, RoleType } from "@skeldjs/hindenburg";

/**
 * Among Us role with configurable team type
 */
export class BasicMouthwashRole<RoomType extends Hostable = Hostable> extends BaseRole<RoomType> {
    static roleMetadata = {
        roleType: RoleType.Crewmate,
        roleTeam: RoleTeamType.Crewmate,
        isGhostRole: false
    };
}