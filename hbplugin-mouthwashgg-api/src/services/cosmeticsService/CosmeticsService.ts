import { Connection, PlayerControl, ReliablePacket } from "@skeldjs/hindenburg";
import { MouthwashApiPlugin } from "../../plugin";
import { LoadHatMessage, LoadPetMessage } from "mouthwash-types";
import { AssetBundle } from "../assets";

interface LoadedCosmetic {
    id: string;
    among_us_id: number;
    resource_id: number;
    resource_path: string;
    bundle_path: string;
    author_id: string;
    type: "HAT"|"PET";
    is_owned: boolean;
}

export class CosmeticsService {
    protected loadedHats: WeakMap<Connection, Map<string, LoadedCosmetic>>;

    constructor(public readonly plugin: MouthwashApiPlugin) {
        this.loadedHats = new WeakMap;
    }

    getLoadedCosmetics(client: Connection) {
        const cachedHats = this.loadedHats.get(client);
        if (cachedHats) {
            return cachedHats;
        }

        const hats: Map<string, LoadedCosmetic> = new Map;
        this.loadedHats.set(client, hats);
        return hats;
    }

    async loadClientCosmeticsToRoom(client: Connection, playerControl?: PlayerControl) {
        if (!this.plugin.authApi) return;
        
        const clientUser = await this.plugin.authApi.getConnectionUser(client);
        if (!clientUser) return;

        const ownedCosmetics = await this.plugin.authApi.getOwnedCosmetics(clientUser.client_id);
        if (!ownedCosmetics) {
            this.plugin.logger.warn("Failed to get owned cosmetics for user with client id %s", clientUser.client_id);
            return;
        }

        const promises = [];
        for (const ownedCosmetic of ownedCosmetics) {
            for (const [ , connection ] of this.plugin.room.connections) {
                const loadedCosmetics = this.getLoadedCosmetics(connection);
                const loadedCosmetic = loadedCosmetics.get(ownedCosmetic.id);
                if (loadedCosmetic) {
                    if (client !== connection || loadedCosmetic.is_owned) {
                        continue;
                    }
                }

                const assetBundle = await AssetBundle.loadFromUrl(ownedCosmetic.bundle_path, false);
                await this.plugin.assetLoader.assertLoaded(connection, assetBundle);

                promises.push(new Promise((res, req) => {
                    this.plugin.assetLoader.waitForLoaded(connection, assetBundle).then(() => {
                        return connection.sendPacket(
                            new ReliablePacket(
                                connection.getNextNonce(),
                                [
                                    ownedCosmetic.type === "HAT"
                                        ? new LoadHatMessage(ownedCosmetic.among_us_id, ownedCosmetic.resource_id, client === connection)
                                        : new LoadPetMessage(ownedCosmetic.among_us_id, ownedCosmetic.resource_id, client === connection)
                                ]
                            )
                        )
                    }).then(res).catch(req);
                }));

                loadedCosmetics.set(ownedCosmetic.id, {
                    id: ownedCosmetic.id,
                    among_us_id: ownedCosmetic.among_us_id,
                    resource_id: ownedCosmetic.resource_id,
                    resource_path: ownedCosmetic.resource_path,
                    bundle_path: ownedCosmetic.bundle_path,
                    author_id: ownedCosmetic.author_id,
                    type: ownedCosmetic.type,
                    is_owned: client === connection
                });
            }
        }
        await Promise.all(promises);
        
        if (playerControl) {
            playerControl.setHat(clientUser.cosmetic_hat);
            playerControl.setPet(clientUser.cosmetic_pet);
            playerControl.setSkin(clientUser.cosmetic_skin);
        }
    }
}