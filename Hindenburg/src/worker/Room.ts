import { Networkable, PlayerData } from "@skeldjs/core";
import { GameSettings } from "@skeldjs/protocol";

import chalk from "chalk";

import { RoomsConfig } from "../interfaces";

import { Worker } from "./Worker";
import { BaseRoom } from "./BaseRoom";
import { Logger } from "../logger";
import { fmtCode } from "../util/fmtCode";
import { Connection } from "./Connection";

export class Room extends BaseRoom {
    constructor(
        public readonly worker: Worker,
        public readonly config: RoomsConfig,
        settings: GameSettings,
        public readonly createdBy: Connection|undefined
    ) {
        super(worker, config, settings, createdBy);

        this.logger = new Logger(() => chalk.yellow(fmtCode(this.code)), this.worker.vorpal);
    }
}
