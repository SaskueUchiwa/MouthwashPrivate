import { Deserializable, MessageDirection, Serializable } from "@skeldjs/protocol";
import { PacketContext } from "../../worker";

export type MessageListener<T extends Serializable, ContextType> = (
    message: T,
    direction: MessageDirection,
    context: ContextType
) => void

export class PerspectiveFilter {
    private loadedFilters: {
        messageClass: Deserializable;
        handler: MessageListener<Serializable, PacketContext>;
    }[];

    constructor() {
        this.loadedFilters = [];
    }

    getFilters() {
        return this.loadedFilters;
    }
}
