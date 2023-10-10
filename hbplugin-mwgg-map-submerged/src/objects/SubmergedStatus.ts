import { InnerShipStatus } from "@skeldjs/hindenburg";

export class SubmergedStatus {
    constructor(public readonly shipStatus: InnerShipStatus) {}
}