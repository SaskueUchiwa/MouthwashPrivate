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
        SELECT *
        FROM user_perks
        WHERE client_id = $1
    `, [ req.params.client_id ]);
    
    return res.status(200).json({
        success: true,
        data: rows.map(row => ({ id: row.perk_id, config: row.config }))
    });
}