import * as crypto from "crypto";
import { AccountServer } from "../AccountServer";

export interface Bundle {
    id: string;
    name: string;
    thumbnail_url: string;
    author_id: string;
    base_resource_id: number;
    stripe_item_id: string;
    price_usd: number;
    added_at: Date;
    asset_bundle_id: string;
}

export interface BundleItem {
    id: string;
    bundle_id: string;
    name: string;
    among_us_id: number;
    resource_path: number;
    type: "HAT"|"PET";
    resource_id: number;
}

export interface BundleOwnership {
    id: string;
    item_id: string|null;
    user_id: string;
    owned_at: Date;
    bundle_id: string|null;
}

export interface UserPerk {
    id: string;
    user_id: string;
    perk_id: string;
    perk_settings: any;
}

export interface UserPerkSettings {
    id: string;
    settings: any;
}

export class CosmeticsController {
    constructor(public readonly server: AccountServer) {}
    
    async getAllCosmeticItemAssetsOwnedByUser(userId: string): Promise<(BundleItem & { asset_bundle_url: string; })[]> {
        const { rows: foundBundleItems } = await this.server.postgresClient.query(`
            SELECT bundle_item.*, asset_bundle.url as asset_bundle_url
            FROM bundle_item
            LEFT JOIN bundle ON bundle.id = bundle_item.bundle_id
            LEFT JOIN asset_bundle ON asset_bundle.id = bundle.asset_bundle_id
            LEFT JOIN user_owned_item ON user_owned_item.item_id = bundle_item.id OR user_owned_item.bundle_id = bundle.id
            WHERE user_owned_item.user_id = $1
        `, [ userId ]);

        return foundBundleItems;
    }
    
    async getAllCosmeticItemsOwned(userId: string): Promise<(BundleItem & { thumbnail_url: string; bundle_name: string; owned_at: Date; })[]> {
        const { rows: foundBundleItems } = await this.server.postgresClient.query(`
            SELECT bundle_item.*, bundle.thumbnail_url, bundle.name AS bundle_name, user_owned_item.owned_at
            FROM bundle_item
            LEFT JOIN bundle ON bundle.id = bundle_item.bundle_id
            LEFT JOIN user_owned_item ON user_owned_item.item_id = bundle_item.id OR user_owned_item.bundle_id = bundle.id
            WHERE user_owned_item.user_id = $1
        `, [ userId ]);

        return foundBundleItems;
    }

    async doesUserOwnBundle(userId: string, bundleId: string) {
        const ownedBundleIds = await this.server.postgresClient.query(`
            SELECT *
            FROM user_owned_item
            WHERE user_id = $1 AND bundle_Id = $2
        `, [ userId, bundleId ]);

        return ownedBundleIds.rowCount > 0;
    }

    async getUserPerks(userId: string) {
        const { rows: foundPerks } = await this.server.postgresClient.query(`
            SELECT *
            FROM user_perk
            WHERE user_id = $1
        `, [ userId ]);

        return foundPerks.map(perk => ({ id: perk.perk_id, settings: perk.perk_settings })) as UserPerkSettings[];
    }

    async setPlayerCosmetics(userId: string, hatId: number, petId: number, skinId: number) {
        const rowsUpdated = await this.server.postgresClient.query(`
            UPDATE users
            SET cosmetic_hat = $1, cosmetic_pet = $2, cosmetic_skin = $3
            WHERE id = $4
            RETURNING *
        `, [ hatId, petId, skinId, userId ]);

        return rowsUpdated.rowCount > 0;
    }

    async getAvailableBundleById(bundleId: string) {
        const { rows: availableBundles } = await this.server.postgresClient.query(`
            SELECT *
            FROM bundle
            WHERE id = $1
        `, [ bundleId ]);
        
        return availableBundles[0] as Bundle|undefined;
    }

    async getAllAvailableBundles(textSearch: string, valuations: string[]): Promise<(Bundle|{ thumbnail_url: string; bundle_name: string; added_at: Date; bundle_price_usd: number; })[]> {
        if (textSearch.length > 0) {
            const { rows: availableBundles } = await this.server.postgresClient.query(`
                SELECT bundle_item.*, bundle.thumbnail_url, bundle.name AS bundle_name, bundle.added_at, bundle.price_usd AS bundle_price_usd,
                    ts_rank(to_tsvector(bundle.name || ' ' || bundle.description || ' ' || bundle.tags), websearch_to_tsquery($1)) as rank
                FROM bundle_item
                LEFT JOIN bundle ON bundle.id = bundle_item.bundle_id
                WHERE bundle.valuation = ANY ($2) AND (to_tsvector(bundle.name || ' ' || bundle.description || ' ' || bundle.tags) @@ websearch_to_tsquery($1))
                ORDER BY rank DESC;
            `, [ textSearch, valuations ]);

            return availableBundles;
        } else {
            const { rows: availableBundles } = await this.server.postgresClient.query(`
                SELECT bundle_item.*, bundle.thumbnail_url, bundle.name AS bundle_name, bundle.added_at, bundle.price_usd AS bundle_price_usd
                FROM bundle_item
                LEFT JOIN bundle ON bundle.id = bundle_item.bundle_id
                WHERE bundle.valuation = ANY ($1)
            `, [ valuations ]);

            return availableBundles;
        }
    }

    async addOwnedBundle(userId: string, bundleId: string) {
        const { rows: bundlesOwned } = await this.server.postgresClient.query(`
            INSERT INTO user_owned_item(id, item_id, user_id, owned_at, bundle_id)
            VALUES($1, NULL, $2, NOW(), $3)
            RETURNING *
        `, [ crypto.randomUUID(), userId, bundleId ]);

        return bundlesOwned[0] as BundleOwnership|undefined;
    }
}