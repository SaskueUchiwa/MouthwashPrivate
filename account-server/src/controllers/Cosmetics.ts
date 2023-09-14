import { AccountServer } from "../AccountServer";

export interface Bundle {
    id: string;
    name: string;
    thumbnail_url: string;
    author_id: string;
    base_resource_id: number;
    price_usd: number;
    added_at: Date;
    asset_bundle_id: string;
    stripe_item_id: string;
    valuation: string;
    tags: string;
    description: string;
}

export interface BundleItem {
    id: string;
    bundle_id: string;
    name: string;
    among_us_id: string;
    resource_path: number;
    type: "HAT"|"PET";
    resource_id: number;
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

export interface StripeItem {
    id: string;
    stripe_price_id: string;
}

export class CosmeticsController {
    constructor(public readonly server: AccountServer) {}
    
    async getAllCosmeticItemsOwnedByUser(userId: string): Promise<(BundleItem & { asset_bundle_url: string; })[]> {
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

    async getUserPerks(userId: string) {
        const { rows: foundPerks } = await this.server.postgresClient.query(`
            SELECT *
            FROM user_perk
            WHERE user_id = $1
        `, [ userId ]);

        return foundPerks.map(perk => ({ id: perk.perk_id, settings: perk.perk_settings })) as UserPerkSettings[];
    }

    async setPlayerCosmetics(userId: string, hatId: string, petId: string, skinId: string) {
        const rowsUpdated = await this.server.postgresClient.query(`
            UPDATE users
            SET cosmetic_hat = $1, cosmetic_pet = $2, cosmetic_skin = $3
            WHERE id = $4
            RETURNING *
        `, [ hatId, petId, skinId, userId ]);

        return rowsUpdated.rowCount > 0;
    }

    async getAllAvailableBundles() {
        const { rows: availableBundles } = await this.server.postgresClient.query(`
            SELECT *
            FROM bundle
        `);

        return availableBundles as Bundle[];
    }
}