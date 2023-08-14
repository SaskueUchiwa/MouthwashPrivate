import { AccountServer } from "$/AccountServer2";

export class BaseRoute {
    constructor(public readonly server: AccountServer) {}
}