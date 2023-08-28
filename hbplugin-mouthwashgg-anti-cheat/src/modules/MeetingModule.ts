import {
    CastVoteMessage,
    Connection,
    EventListener,
    EventTarget,
    MeetingHudVotingCompleteEvent,
    PlayerStartMeetingEvent,
    ReportDeadBodyMessage,
    Room
} from "@skeldjs/hindenburg";

import { InfractionSeverity, MouthwashAntiCheatPlugin } from "../plugin";
import { InfractionName } from "../enums";
import { MouthwashMeetingHud } from "mouthwash-types";

export class MeetingModule extends EventTarget {
    protected _isVotingComplete: boolean;
    protected _inDiscussionTime: boolean;

    constructor(public readonly plugin: MouthwashAntiCheatPlugin) {
        super();

        this._isVotingComplete = false;
        this._inDiscussionTime = false;
    }

    async onCastVoteMessage(sender: Connection, castVoteMessage: CastVoteMessage) {
        if (!this.plugin.room.meetingHud)
            return this.plugin.createInfraction(sender, InfractionName.InvalidRpcMeetingVote, { }, InfractionSeverity.High);

        if (this._isVotingComplete)
            return this.plugin.createInfraction(sender, InfractionName.InvalidRpcMeetingVote, { }, InfractionSeverity.Medium);

        if (this._inDiscussionTime)
            return this.plugin.createInfraction(sender, InfractionName.InvalidRpcMeetingVote, { }, InfractionSeverity.Medium);

        const castVoteVoter = this.plugin.room.getPlayerByPlayerId(castVoteMessage.votingid);
        const castVoteSuspect = this.plugin.room.getPlayerByPlayerId(castVoteMessage.suspectid);
        if (!castVoteVoter)
            return this.plugin.createInfraction(sender, InfractionName.ForbiddenRpcMeetingVote,
                { voterPlayerId: castVoteMessage.votingid, suspectPlayerId: castVoteMessage.suspectid }, InfractionSeverity.High);

        if (castVoteVoter.clientId !== sender.clientId)
            return this.plugin.createInfraction(sender, InfractionName.ForbiddenRpcMeetingVote,
                { voterPlayerId: castVoteMessage.votingid, suspectPlayerId: castVoteMessage.suspectid }, InfractionSeverity.Critical);

        const meetingHud = this.plugin.room.meetingHud as MouthwashMeetingHud<Room>|undefined;
        const voterState = meetingHud?.voteStates.get(castVoteMessage.votingid);
        if (!voterState) return;

        if (voterState.hasVoted) {
            return this.plugin.createInfraction(sender, InfractionName.DuplicateRpcMeetingVote,
                { voterPlayerId: castVoteMessage.votingid, suspectPlayerId: castVoteMessage.suspectid, alreadyVotedForPlayerId: voterState.votedForId }, InfractionSeverity.Medium);
        }

        if (castVoteSuspect) {
            if (castVoteSuspect.info?.isDead) {
                return this.plugin.createInfraction(sender, InfractionName.InvalidRpcMeetingVote,
                    { voterPlayerId: castVoteMessage.votingid, suspectPlayerId: castVoteMessage.suspectid, isDead: true }, InfractionSeverity.High);
            }
        } else if (castVoteMessage.suspectid !== 255) {
            return this.plugin.createInfraction(sender, InfractionName.InvalidRpcMeetingVote,
                { voterPlayerId: castVoteMessage.votingid, suspectPlayerId: castVoteMessage.suspectid, isDead: false }, InfractionSeverity.High);
        }
    }

    async onReportDeadBody(sender: Connection, reportDeadBodyMessage: ReportDeadBodyMessage) {
        if (reportDeadBodyMessage.bodyid !== 255)
            return this.plugin.createInfraction(sender, InfractionName.InvalidRpcReportDeadBody, { bodyId: reportDeadBodyMessage.bodyid }, InfractionSeverity.High);

        if (!this.plugin.room.shipStatus)
            return this.plugin.createInfraction(sender, InfractionName.InvalidRpcMeetingStart, { state: "LOBBY" }, InfractionSeverity.High);
        
        if (this.plugin.room.meetingHud)
            return this.plugin.createInfraction(sender, InfractionName.InvalidRpcMeetingStart, { state: "MEETING" }, InfractionSeverity.High);
    }

    @EventListener()
    async onMeetingBegin(ev: PlayerStartMeetingEvent<Room>) {
        this._isVotingComplete = false;
        this._inDiscussionTime = true;

        setTimeout(() => {
            this._inDiscussionTime = false;
        }, 8000 + this.plugin.room.settings.discussionTime * 1000);
    }

    @EventListener()
    async onVotingComplete(ev: MeetingHudVotingCompleteEvent<Room>) {
        this._isVotingComplete = true;
    }
}