import { AirshipTasks, CompleteTaskMessage, Connection, EventTarget, GameMap, MiraHQTasks, PolusTasks, TaskLength, TaskType, TheSkeldTasks, Vector2 } from "@skeldjs/hindenburg";
import { InfractionSeverity, MouthwashAntiCheatPlugin } from "../plugin";
import { InfractionName } from "../enums";

interface ConsoleDataModel {
    index: number;
    usableDistance: number;
    position: {
        x: number;
        y: number;
    };
}

interface TaskDataModel {
    index: number;
    hudText: string;
    taskType: TaskType;
    length: TaskLength;
    consoles: Record<number, ConsoleDataModel>;
}

export class TaskModule extends EventTarget {
    constructor(public readonly plugin: MouthwashAntiCheatPlugin) {
        super();
    }

    getTasksOnMap(mapId: GameMap): Record<number, TaskDataModel> {
        switch (mapId) {
            case GameMap.TheSkeld:
            case GameMap.AprilFoolsTheSkeld:
                return TheSkeldTasks;
            case GameMap.MiraHQ:
                return MiraHQTasks;
            case GameMap.Polus:
                return PolusTasks;
            case GameMap.Airship:
                return AirshipTasks;
        }
    }
    
    async onCompleteTask(sender: Connection, completeTaskRpcMessage: CompleteTaskMessage) {
        const defaultInfraction = await this.plugin.createInfraction(sender, InfractionName.ForbiddenRpcCompleteTask,
            { taskIdx: completeTaskRpcMessage.taskidx }, InfractionSeverity.High);
        if (defaultInfraction)
            return defaultInfraction;

        const player = sender.getPlayer();
        const playerTransform = player?.transform;
        if (!player || !playerTransform)
            return;

        if (!this.plugin.room.shipStatus) {
            return await this.plugin.createInfraction(sender, InfractionName.InvalidRpcCompleteTask,
                { taskIdx: completeTaskRpcMessage.taskidx, inLobby: true }, InfractionSeverity.High);
        }

        if (this.plugin.room.meetingHud) {
            return await this.plugin.createInfraction(sender, InfractionName.InvalidRpcCompleteTask,
                { taskIdx: completeTaskRpcMessage.taskidx, inMeeting: true }, InfractionSeverity.High);
        }

        const taskInQuestion = player.info?.taskStates[completeTaskRpcMessage.taskidx];
        const taskInQuestionId = player.info?.taskIds[completeTaskRpcMessage.taskidx];
        if (!taskInQuestion || !taskInQuestionId) {
            return await this.plugin.createInfraction(sender, InfractionName.InvalidRpcCompleteTask,
                { taskIdx: completeTaskRpcMessage.taskidx }, InfractionSeverity.High);
        }
        if (taskInQuestion.completed) {
            return await this.plugin.createInfraction(sender, InfractionName.InvalidRpcCompleteTask,
                { taskIdx: completeTaskRpcMessage.taskidx, isCompleted: true }, InfractionSeverity.High);
        }

        const mapTasks = this.getTasksOnMap(this.plugin.room.settings.map);
        const taskInMap = mapTasks[taskInQuestionId];
        for (const consoleId in taskInMap.consoles) {
            const console = taskInMap.consoles[consoleId];
            if (new Vector2(console.position).dist(playerTransform.position) < console.usableDistance + 0.5) {
                return;
            }
        }
        
        return await this.plugin.createInfraction(sender, InfractionName.UnableRpcCompleteTask,
                { taskIdx: completeTaskRpcMessage.taskidx, position: playerTransform.position }, InfractionSeverity.High);
    }
}