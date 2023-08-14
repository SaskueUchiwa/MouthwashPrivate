import express from "express";

import { AccountServer } from "$/AccountServer";

export default async function (server: AccountServer, req: express.Request, res: express.Response) {
    const verificationIdQuery = req.query.t;
    if (typeof verificationIdQuery !== "string") {
        return res.status(400).end("No verification token provided, try clicking the link in your email address again.");
    }
    
    const { rows: foundVerifications } = await server.postgresClient.query(`
        UPDATE email_verification
        SET verified_at = NOW()
        WHERE id = $1
        RETURNING *
    `, [ verificationIdQuery ]);

    const foundVerification = foundVerifications?.[0];
    if (!foundVerification) {
        return res.status(404).end("Invalid verification token provided, try clicking the link in your email address again, or requesting to send the verification link again.");
    }

    const { rows: foundAccounts } = await server.postgresClient.query(`
        UPDATE users
        SET email_verified = TRUE
        WHERE id = $1
        RETURNING *
    `, [ foundVerification.user_id ]);

    const foundAccount = foundAccounts?.[0];
    if (!foundAccount) {
        return res.status(500).end("Failed to verify the account, as it couldn't be found on the server even though the verification token exists.");
    }

    return res.status(200).end("Successfully verified account, you can now close this tab and go back to the launcher to log in.");
}