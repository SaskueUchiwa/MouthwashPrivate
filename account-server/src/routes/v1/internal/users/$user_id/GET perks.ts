import express from "express";

import { AccountServer } from "$/index";

export default async function (server: AccountServer, req: express.Request, res: express.Response) {
    if (!req.params.user_id) {
        return res.status(400).json({
            code: 400,
            message: "BAD_REQUEST",
            details: "Expected 'user_id' as part of request endpoint"
        });
    }
    
    const { rows } = await server.postgresClient.query(`
        SELECT *
        FROM user_perk
        WHERE user_id = $1
    `, [ req.params.user_id ]);
    
    return res.status(200).json({
        success: true,
        data: rows.map(row => ({ id: row.perk_id, config: row.config }))
    });
}