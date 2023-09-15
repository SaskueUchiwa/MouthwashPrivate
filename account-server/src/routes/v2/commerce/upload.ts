import * as mediator from "mouthwash-mediator";
import * as undici from "undici";
import * as crypto from "crypto";
import * as ark from "arktype";
import { BaseRoute } from "../../BaseRoute";
import { ForbiddenError, InvalidBodyError } from "../../../errors";
import { Bundle, BundleItem, StripeItem } from "../../../controllers";

const uploadCosmeticBundleBodyValidator = ark.type({
    file_uuid: "string",
    bundle_data_base_64: "string",
    cosmetic_asset_paths: "string[]",
    base_resource_id: "integer"
});

const publishCosmeticBundleBodyValidator = ark.scope({
    item_valuation: "'GHOST'|'CREWMATE'|'IMPOSTOR'|'POLUS'",
    bundle_config: {
        id: "string",
        name: "string",
        thumbnail_url: "string",
        author_id: "string",
        base_resource_id: "integer",
        price_usd: "integer",
        file_uuid: "string",
        valuation: "item_valuation",
        tags: "string[]",
        description: "string",
        items: "item_config[]"
    },
    item_config: {
        id: "string",
        name: "string",
        among_us_id: "string",
        resource_path: "string",
        type: "string",
        resource_id: "integer",
        valuation: "item_valuation"
    }
}).compile();

export class UploadRoute extends BaseRoute {
    async uploadFileToBucket(path: string, contents: Buffer, fileType: string) {
        if (!this.server.config.supabase)
            throw new mediator.InternalServerError(new Error("Supabase storage bucket not setup on server, set SUPABASE_BASE_API_URL"));

        await undici.request(this.server.config.supabase.base_api_url + "/storage/v1/object/" + path, {
            method: "DELETE",
            headers: {
                authorization: "Bearer " + this.server.config.supabase.service_role_token,
                cacheControl: "3600"
            }
        });

        await undici.request(this.server.config.supabase.base_api_url + "/storage/v1/object/" + path, {
            method: "POST",
            body: contents,
            headers: {
                authorization: "Bearer " + this.server.config.supabase.service_role_token,
                cacheControl: "3600",
                "content-type": fileType
            }
        });
    }

    @mediator.Endpoint(mediator.HttpMethod.POST, "/v2/commerce/upload")
    async uploadCosmeticBundle(transaction: mediator.Transaction<{}>) {
        const session = await this.server.sessionsController.validateAuthorization(transaction);

        if (session.user_id !== "6a5b4f31-74f9-416c-8679-6a3f10b452f3")
            throw new ForbiddenError("User does not have commerce access");
        
        if (!this.server.config.supabase)
            throw new mediator.InternalServerError(new Error("Supabase storage bucket not setup on server, set SUPABASE_BASE_API_URL"));

        const { data, problems } = uploadCosmeticBundleBodyValidator(transaction.getBody());
        if (data === undefined) throw new InvalidBodyError(problems);
        const bundleData = Buffer.from(data.bundle_data_base_64, "base64");

        const hash = crypto.createHash("sha256").update(bundleData).digest("hex").toUpperCase();

        const bundleMeta = {
            assetBundleId: data.base_resource_id,
            hash,
            assets: data.cosmetic_asset_paths.map((item: any) => {
                return {
                    type: 0, /* asset, not assembly */
                    path: item,
                    details: null
                }
            })
        };

        await this.uploadFileToBucket("MouthwashAssets/" + data.file_uuid, bundleData, "application/octet-stream");
        await this.uploadFileToBucket("MouthwashAssets/" + data.file_uuid + ".sha256", Buffer.from(hash), "text/plain");
        await this.uploadFileToBucket("MouthwashAssets/" + data.file_uuid + ".json", Buffer.from(JSON.stringify(bundleMeta), "utf8"), "application/json");

        const { rows: existingBundles } = await this.server.postgresClient.query(`
            SELECT *
            FROM asset_bundle
            WHERE id = $1
        `, [ data.file_uuid ]);
        const existingBundle = existingBundles[0];

        if (existingBundle) {
            await this.server.postgresClient.query(`
                UPDATE asset_bundle
                SET hash = $2
                WHERE id = $1
            `, [ data.file_uuid, hash ]);
        } else {
            await this.server.postgresClient.query(`
                INSERT INTO asset_bundle(id, url, hash)
                VALUES ($1, $2, $3)
            `, [ data.file_uuid, this.server.config.supabase.base_api_url + "/storage/v1/object/public/MouthwashAssets/" + data.file_uuid, hash ]);
        }

        transaction.respondJson({});
    }
    
    @mediator.Endpoint(mediator.HttpMethod.POST, "/v2/commerce/publish")
    async publishCosmeticBundle(transaction: mediator.Transaction<{}>) {
        const session = await this.server.sessionsController.validateAuthorization(transaction);

        if (session.user_id !== "6a5b4f31-74f9-416c-8679-6a3f10b452f3")
            throw new ForbiddenError("User does not have commerce access");
        
        if (!this.server.config.supabase)
            throw new mediator.InternalServerError(new Error("Supabase storage bucket not setup on server, set SUPABASE_BASE_API_URL"));

        const { data, problems } = publishCosmeticBundleBodyValidator.bundle_config(transaction.getBody());
        if (data === undefined) throw new InvalidBodyError(problems);

        const { rows: existingBundles } = await this.server.postgresClient.query(`
            SELECT *
            FROM bundle
            WHERE id = $1
        `, [ data.id ]);
        const existingBundle: Bundle|undefined = existingBundles[0];
        if (existingBundle) {
            const { rows: bundleStripeItems } = await this.server.postgresClient.query(`
                SELECT *
                FROM stripe_item
                WHERE id = $1
            `, [ existingBundle.stripe_item_id ]);
            const bundleStripeItem = bundleStripeItems[0] as StripeItem;

            if (!bundleStripeItem) {
                // todo: create new stripe product and price
                const { rows: createdStripeItems } = await this.server.postgresClient.query(`
                    INSERT INTO stripe_item(id, stripe_price_id)
                    VALUES ($1, $2)
                    RETURNING *
                `, [ crypto.randomUUID(), "" /* stripe_price_id */ ]);
                const createdStripeItem = createdStripeItems[0] as StripeItem|undefined;
                if (!createdStripeItem)
                    throw new mediator.InternalServerError(new Error("Failed to create Stripe price"));

                existingBundle.stripe_item_id = createdStripeItem.id;
            } else if (existingBundle.price_usd !== data.price_usd) {
                // todo: create stripe price for existing item
                await this.server.postgresClient.query(`
                    UPDATE stripe_item
                    SET stripe_price_id = $2
                    WHERE id = $1
                `, [ bundleStripeItem.id, "" /* stripe_price_id */ ])
            } // else, the price is the same and doesn't need updating

            await this.server.postgresClient.query(`
                UPDATE bundle
                SET name = $2, thumbnail_url = $3, author_id = $4, base_resource_id = $5, price_usd = $6, asset_bundle_id = $7, stripe_item_id = $8, valuation = $9, tags = $10, description = $11
                WHERE id = $1
            `, [ existingBundle.id, data.name, data.thumbnail_url, data.author_id, data.base_resource_id, data.price_usd, data.file_uuid, existingBundle.stripe_item_id, data.valuation, data.tags.join(" "), data.description ]);
        
            const { rows: existingBundleItems } = await this.server.postgresClient.query(`
                SELECT *
                FROM bundle_item
                WHERE bundle_id = $1
            `, [ existingBundle.id ]) as { rows: BundleItem[] };

            // diff items, add new ones, update existing ones, remove old ones
            for (const item of data.items) {
                const existingItem = existingBundleItems.find(existingItem => existingItem.id === item.id);
                if (existingItem) {
                    await this.server.postgresClient.query(`
                        UPDATE bundle_item
                        SET name = $2, among_us_id = $3, resource_path = $4, type = $5, resource_id = $6, valuation = $7
                        WHERE id = $1
                    `, [ item.id, item.name, item.among_us_id, item.resource_path, item.type, item.resource_id, item.valuation ]);
                } else {
                    await this.server.postgresClient.query(`
                        INSERT INTO bundle_item(id, name, bundle_id, among_us_id, resource_path, type, resource_id, valuation)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    `, [ crypto.randomUUID(), item.name, data.id, item.among_us_id, item.resource_path, item.type, item.resource_id, item.valuation ]);
                }
            }

            for (const existingItem of existingBundleItems) {
                const item = data.items.find(item => item.id === existingItem.id);
                if (!item) {
                    await this.server.postgresClient.query(`
                        DELETE
                        FROM bundle_item
                        WHERE id = $1
                    `, [ existingItem.id ]);
                }
            }
        } else {
            const { rows: createdStripeItems } = await this.server.postgresClient.query(`
                INSERT INTO stripe_item(id, stripe_price_id)
                VALUES ($1, $2)
                RETURNING *
            `, [ crypto.randomUUID(), "" /* stripe_price_id */ ]);
            const createdStripeItem = createdStripeItems[0] as StripeItem|undefined;
            if (!createdStripeItem) throw new mediator.InternalServerError(new Error("Failed to create Stripe price"));

            const { rows: createdBundles } = await this.server.postgresClient.query(`
                INSERT INTO bundle(id, name, thumbnail_url, author_id, base_resource_id, price_usd, added_at, asset_bundle_id, stripe_item_id, valuation, tags, description)
                VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9, $10, $11)
                RETURNING *
            `, [ data.id, data.name, data.thumbnail_url, data.author_id, data.base_resource_id, data.price_usd, data.file_uuid, createdStripeItem.id, data.valuation, data.tags.join(" "), data.description ]);
            const createdBundle = createdBundles[0] as Bundle|undefined;
            if (!createdBundle) throw new mediator.InternalServerError(new Error("Failed to create bundle"));
            
            for (const item of data.items) {
                await this.server.postgresClient.query(`
                    INSERT INTO bundle_item(id, name, bundle_id, among_us_id, resource_path, type, resource_id, valuation)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `, [ crypto.randomUUID(), item.name, data.id, item.among_us_id, item.resource_path, item.type, item.resource_id, item.valuation ]);
            }
        }
        transaction.respondJson({});
    }
}