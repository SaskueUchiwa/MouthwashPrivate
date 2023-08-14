import express from "express";

import { AccountServer } from "$/AccountServer";

export default async function (server: AccountServer, req: express.Request, res: express.Response) {
    if (!req.body.cosmetic_hat) {
        return res.status(400).json({
            code: 400,
            message: "BAD_REQUEST",
            details: "Expected 'cosmetic_hat' as part of the json request body"
        });
    }
    if (!req.body.cosmetic_pet) {
        return res.status(400).json({
            code: 400,
            message: "BAD_REQUEST",
            details: "Expected 'cosmetic_pet' as part of the json request body"
        });
    }
    if (!req.body.cosmetic_skin) {
        return res.status(400).json({
            code: 400,
            message: "BAD_REQUEST",
            details: "Expected 'cosmetic_skin' as part of the json request body"
        });
    }

    if (!req.params.user_id) {
        return res.status(400).json({
            code: 400,
            message: "BAD_REQUEST",
            details: "Expected 'user_id' as part of request endpoint"
        });
    }
    
    const rowsUpdated = await server.postgresClient.query(`
        UPDATE users
        SET cosmetic_hat = $1, cosmetic_pet = $2, cosmetic_skin = $3
        WHERE id = $4
        RETURNING *
    `, [ req.body.cosmetic_hat, req.body.cosmetic_pet, req.body.cosmetic_skin, req.params.user_id ]);

    if (rowsUpdated.rowCount <= 0) {
        return res.status(404).json({
            code: 404,
            message: "NOT_FOUND",
            details: "User with that client id could not be found"
        });
    }

    return res.status(200).json({
        success: true,
        data: {}
    });
}