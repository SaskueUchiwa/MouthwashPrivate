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
        FROM users
        WHERE id = $1
    `, [ req.params.user_id ]);

    const user = rows[0];
    if (!user) {
        return res.status(404).json({
            code: 404,
            message: "NOT_FOUND",
            details: "User with that client id could not be found"
        });
    }

    return res.status(200).json({
        success: true,
        data: {
            id: user.id,
            email: user.email,
            display_name: user.display_name,
            created_at: user.created_at,
            banned_until: user.banned_until,
            muted_until: user.muted_until,
            game_settings: user.game_settings,
            cosmetic_hat: user.cosmetic_hat,
            cosmetic_pet: user.cosmetic_pet,
            cosmetic_skin: user.cosmetic_skin
        }
    });
}