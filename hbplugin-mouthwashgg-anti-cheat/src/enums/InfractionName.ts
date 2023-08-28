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
     * or medium infraction.
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
     * Player vented despite not having permission to do so (i.e. being an impostor) - a
     * high infraction.
     */
    ForbiddenRpcVent = "FORBIDDEN_RPC_VENT",
    /**
     * Player vented and had permission to do so, but the vent action was invalid, e.g. due to the player not being
     * in the right place - a medium infraction.
     */
    IllegalRpcVent = "ILLEGAL_RPC_VENT",
    /**
     * Player teleported to a location illegally, e.g. while not in a vent, or moving to
     * a vent not in the same vent network as the one they were in previously - a medium infraction.
     */
    ForbiddenRpcTeleport = "FORBIDDEN_RPC_TELEPORT",
    /**
     * Player attempted to report a dead body, that wasn't starting an emergency meeting -
     * a high infraction.
     */
    InvalidRpcReportDeadBody = "INVALID_RPC_REPORT_DEAD_BODY",
    /**
     * Player attempted to start a meeting in an invalid state, e.g. there is already a meeting
     * going on - a high infraction.
     */
    InvalidRpcMeetingStart = "INVALID_RPC_MEETING_START",
    /**
     * Player sent a message in chat too quickly before the last message - a low or medium infraction.
     */
    RateLimitedRpcSendChat = "RATE_LIMITED_RPC_SEND_CHAT"
}