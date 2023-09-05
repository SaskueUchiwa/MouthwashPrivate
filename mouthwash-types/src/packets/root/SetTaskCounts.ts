import { BaseRootMessage, HazelReader, HazelWriter } from "@skeldjs/hindenburg";
import { MouthwashRootMessageTag } from "../../enums";

export class SetTaskCountsMessage extends BaseRootMessage {
    static messageTag = MouthwashRootMessageTag.SetTaskCounts as const;
    messageTag = MouthwashRootMessageTag.SetTaskCounts as const;

    constructor(
        public readonly totalTasks: number,
        public readonly tasksCompleted: number
    ) {
        super();
    }

    static Deserialize(reader: HazelReader) {
        const totalTasks = reader.int32();
        const tasksCompleted = reader.int32();
        return new SetTaskCountsMessage(totalTasks, tasksCompleted);
    }

    Serialize(writer: HazelWriter) {
        writer.int32(this.totalTasks);
        writer.int32(this.tasksCompleted);
    }
}