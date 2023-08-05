import express from "express";

import { AccountServer } from "$/index";

export default async function (server: AccountServer, req: express.Request, res: express.Response) {
    if (!req.params.client_id) {
        return res.status(400).json({
            code: 400,
            message: "BAD_REQUEST",
            details: "Expected 'client_id' as part of request endpoint"
        });
    }
    
    const { rows } = await server.postgresClient.query(`
        SELECT bundle_items.*, bundles.bundle_path
        FROM bundle_items
        LEFT JOIN bundles ON bundles.id = bundle_items.bundle_id
        LEFT JOIN owned_items ON owned_items.item_id = bundle_items.id
        WHERE owned_items.client_id = $1
    `, [ req.params.client_id ]);
    
    return res.status(200).json({
        success: true,
        data: rows.map(row => ({
            id: row.id,
            name: row.name,
            among_us_id: row.among_us_id,
            resource_id: row.resource_id,
            resource_path: row.resource_path,
            bundle_path: row.bundle_path,
            type: row.type
        }))
    });
}