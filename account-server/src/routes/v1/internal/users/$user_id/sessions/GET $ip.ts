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

    if (!req.params.ip) {
        return res.status(400).json({
            code: 400,
            message: "BAD_REQUEST",
            details: "Expected 'ip' as part of request endpoint"
        });
    }
    
    const { rows: foundSessions } = await server.postgresClient.query(`
        SELECT * 
        FROM session
        WHERE user_id = $1
        AND ip = $2
    `, [ req.params.user_id, req.params.ip ]);

    const session = foundSessions?.[0];

    if (!session) {
        res.status(401).json({
            code: 401,
            message: "UNAUTHORIZED",
            details: "No session with that user_id and ip was found"
        });
        return;
    }

    return res.status(200).json({
        success: true,
        data: {
            user_id: session.user_id,
            client_token: session.client_token || ""
        }
    });
}