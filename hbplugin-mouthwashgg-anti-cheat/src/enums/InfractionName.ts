/**
 * INFRACTION GUIDE
 * ================
 * CRITICAL - Should _never_ happen even with extremely high ping and has a major
 * impact on gameplay.
 * HIGH - Could theoretically happen with high ping but never with low ping, or is a
 * cheat that should be impossible but doesn't have any significant impact on gameplay.
 * MEDIUM - Could easily happen with higher ping, or could be the result of client-server
 * desync and has little to no significant impact on gameplay. Alternatively, important
 * side information that could be used alongside other infraction logs to determine
 * if a player is cheating.
 * LOW - Shouldn't happen in perfect gameplay but could very well happen under medium-high
 * ping.
 */
export enum InfractionName {
    /**
     * Player attempted to call an RPC for an object that doesn't exist. Possibly communicating
     * with another client discreetly - a medium infraction.
     */
    UnknownRpcInnernetObject = "UNKNOWN_RPC_INNERNET_OBJECT",
    /**
     * Player attempted to call an RPC for an object that they don't own - a critical infraction.
     */
    ForbiddenRpcInnernetObject = "FORBIDDEN_RPC_INNERNET_OBJECT",
    /**
     * Player attempted to call an RPC that they shouldn't be able to call - a critical infraction.
     */
    ForbiddenRpcCode = "FORBIDDEN_RPC_CODE",
    /**
     * Player attempted to call an RPC that doesn't exist on the server - a hard infraction.
     */
    InvalidRpcCode = "INVALID_RPC_CODE",
    /**
     * Player sent a vote in a meeting that was either not theirs - a critical infraction -
     * or belonged to an invalid player - a high infraction.
     */
    ForbiddenRpcMeetingVote = "FORBIDDEN_RPC_MEETING_VOTE",
    /**
     * Player attempted to voted to eject a player more than once - a high infraction.
     */
    DuplicateRpcMeetingVote = "DUPLICATE_RPC_MEETING_VOTE",
    /**
     * Player voted to eject a player that doesn't exist in the meeting - a high
     * infraction.
     */
    InvalidRpcMeetingVote = "INVALID_RPC_MEETING_VOTE",
    /**
     * Player requested a colour that isn't in the game - a critical infraction.
     */
    InvalidRpcColor = "INVALID_RPC_COLOR",
    /**
     * Player requested a name that doesn't match their user display name - a critical infraction.
     */
    InvalidRpcName = "INVALID_RPC_NAME",
    /**
     * Player set their skin to a cosmetic that isn't in the game, or that they don't own - a critical infraction.
     */
    InvalidRpcSkin = "INVALID_RPC_SKIN",
    /**
     * Player set their hat to a cosmetic that isn't in the game, or that they don't own - a critical infraction.
     */
    InvalidRpcHat = "INVALID_RPC_HAT",
    /**
     * Player set their pet to a cosmetic that isn't in the game, or that they don't own - a critical infraction.
     */
    InvalidRpcPet = "INVALID_RPC_PET",
    /**
     * Player vented despite not having permission to do so (i.e. being the Impostor) - a
     * high infraction.
     */
    ForbiddenRpcVent = "FORBIDDEN_RPC_VENT",
    /**
     * Player teleported to a location illegally, e.g. while not in a vent - a medium infraction.
     */
    ForbiddenRpcTeleport = "FORBIDDEN_RPC_TELEPORT"
}