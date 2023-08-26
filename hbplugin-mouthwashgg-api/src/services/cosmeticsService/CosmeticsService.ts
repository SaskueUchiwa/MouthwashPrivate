import { Connection, PlayerControl, ReliablePacket, Room, RpcMessage, SetHatMessage, SetPetMessage, SetSkinMessage } from "@skeldjs/hindenburg";
import { LoadHatMessage, LoadPetMessage } from "mouthwash-types";

import { MouthwashApiPlugin } from "../../plugin";
import { AssetBundle } from "../assets";
import { chunkArr } from "../../util/chunkArr";

interface LoadedCosmetic {
    id: string;
    among_us_id: number;
    resource_id: number;
    resource_path: string;
    asset_bundle_url: string;
    type: "HAT"|"PET";
    is_owned: boolean;
}

export class CosmeticsService {
    protected connectionLoadedCosmetics: WeakMap<Connection, Map<string, LoadedCosmetic>>;
    protected roomLoadedCosmetics: Map<string, LoadedCosmetic>;

    constructor(public readonly plugin: MouthwashApiPlugin) {
        this.connectionLoadedCosmetics = new WeakMap;
        this.roomLoadedCosmetics = new Map;
    }

    getLoadedCosmetics(client: Connection) {
        const cachedHats = this.connectionLoadedCosmetics.get(client);
        if (cachedHats) {
            return cachedHats;
        }

        const hats: Map<string, LoadedCosmetic> = new Map;
        this.connectionLoadedCosmetics.set(client, hats);
        return hats;
    }

    async loadRoomCosmeticsForClient(connection: Connection) {
        if (!this.plugin.authApi) return;
        
        const clientUser = await this.plugin.authApi.getConnectionUser(connection);
        if (!clientUser) return;

        const ownedCosmeticIdsSet = new Set(clientUser.owned_cosmetics.map(cosmetic => cosmetic.id));

        const messages: (LoadHatMessage|LoadPetMessage)[] = [];
        const promises = [];
        const recipLoadedCosmetics = this.getLoadedCosmetics(connection);
        for (const [ cosmeticId, loadedCosmetic ] of this.roomLoadedCosmetics) {
            if (recipLoadedCosmetics.has(cosmeticId))
                continue;

            const assetBundle = await AssetBundle.loadFromUrl(loadedCosmetic.asset_bundle_url, false);
            await this.plugin.assetLoader.assertLoaded(connection, assetBundle);

            promises.push(this.plugin.assetLoader.waitForLoaded(connection, assetBundle).then(() => {
                messages.push(loadedCosmetic.type === "HAT"
                    ? new LoadHatMessage(loadedCosmetic.among_us_id, loadedCosmetic.resource_id, ownedCosmeticIdsSet.has(loadedCosmetic.id))
                    : new LoadPetMessage(loadedCosmetic.among_us_id, loadedCosmetic.resource_id, ownedCosmeticIdsSet.has(loadedCosmetic.id)));
            }).catch(() => {}));

            recipLoadedCosmetics.set(loadedCosmetic.id, {
                id: loadedCosmetic.id,
                among_us_id: loadedCosmetic.among_us_id,
                resource_id: loadedCosmetic.resource_id,
                resource_path: loadedCosmetic.resource_path,
                asset_bundle_url: loadedCosmetic.asset_bundle_url,
                type: loadedCosmetic.type,
                is_owned: false
            });
        }

        await Promise.all(promises);
        const sendPromises = [];
        const chunkedMessages = chunkArr(messages, 20);
        for (const chunk of chunkedMessages) {
            sendPromises.push(connection.sendPacket(new ReliablePacket(connection.getNextNonce(), chunk)));
        }
        await Promise.all(sendPromises);
    }

    async loadClientCosmeticsToRoom(client: Connection) {
        if (!this.plugin.authApi) return;
        
        const clientUser = await this.plugin.authApi.getConnectionUser(client);
        if (!clientUser) return;

        const connectionMessages: Map<Connection, (LoadHatMessage|LoadPetMessage)[]> = new Map;
        const promises = [];
        for (const ownedCosmetic of clientUser.owned_cosmetics) {
            if (this.roomLoadedCosmetics.get(ownedCosmetic.id))
                continue;

            for (const [ , connection ] of this.plugin.room.connections) {
                const existingMessages = connectionMessages.get(connection);
                const messages = existingMessages || [];
                if (!existingMessages) {
                    connectionMessages.set(connection, messages);
                }

                const loadedCosmetics = this.getLoadedCosmetics(connection);
                const loadedCosmetic = loadedCosmetics.get(ownedCosmetic.id);
                if (loadedCosmetic) {
                    if (client !== connection || loadedCosmetic.is_owned) {
                        continue;
                    }
                }

                const assetBundle = await AssetBundle.loadFromUrl(ownedCosmetic.asset_bundle_url, false);
                await this.plugin.assetLoader.assertLoaded(connection, assetBundle);

                promises.push(this.plugin.assetLoader.waitForLoaded(connection, assetBundle).then(() => {
                    messages.push(ownedCosmetic.type === "HAT"
                        ? new LoadHatMessage(ownedCosmetic.among_us_id, ownedCosmetic.resource_id, client === connection)
                        : new LoadPetMessage(ownedCosmetic.among_us_id, ownedCosmetic.resource_id, client === connection));
                }).catch(() => {}));
                        
                this.roomLoadedCosmetics.set(ownedCosmetic.id, {
                    id: ownedCosmetic.id,
                    among_us_id: ownedCosmetic.among_us_id,
                    resource_id: ownedCosmetic.resource_id,
                    resource_path: ownedCosmetic.resource_path,
                    asset_bundle_url: ownedCosmetic.asset_bundle_url,
                    type: ownedCosmetic.type,
                    is_owned: false
                });
            }
        }
        await Promise.all(promises);

        const sendPromises = [];
        for (const [ connection, messages ] of connectionMessages) {
            const chunkedMessages = chunkArr(messages, 20);
            for (const chunk of chunkedMessages) {
                sendPromises.push(connection.sendPacket(new ReliablePacket(connection.getNextNonce(), chunk)));
            }
        }
        await Promise.all(sendPromises);
    }

    async updatePlayerCosmetics(client: Connection, playerControl: PlayerControl) {
        if (!this.plugin.authApi) return;
        
        const clientUser = await this.plugin.authApi.getConnectionUser(client);
        if (!clientUser) return;
        
        if (playerControl) {
            playerControl.setHat(clientUser.cosmetic_hat);
            playerControl.setPet(clientUser.cosmetic_pet);
            playerControl.setSkin(clientUser.cosmetic_skin);
        }
    }

    async updateRoomCosmeticsForClient(client: Connection) {
        const rpcs = [];
        for (const [ , player ] of this.plugin.room.players) {
            if (player.clientId === client.clientId)
                continue;

            const playerInfo = player.info;
            if (!playerInfo) continue;

            const playerControl = player.control;
            if (!playerControl) continue;

            rpcs.push(
                new RpcMessage(playerControl.netId, new SetHatMessage(playerInfo.hat)),
                new RpcMessage(playerControl.netId, new SetPetMessage(playerInfo.pet)),
                new RpcMessage(playerControl.netId, new SetSkinMessage(playerInfo.skin))
            );
        }

        const chunked = chunkArr(rpcs, 20);
        for (const chunk of chunked) {
            await this.plugin.room.broadcastMessages(chunk, undefined, [ client ]);
        }
    }
}