import crypto from "crypto";

import express from "express";
import bcrypt from "bcrypt";

import { AccountServer } from "$/index";

export default async function (server: AccountServer, req: express.Request, res: express.Response) {
    if (!req.body.email) {
        res.status(400).json({
            code: 400,
            message: "BAD_REQUEST",
            details: "Expected 'email' as part of the json request body"
        });
        return;
    }

    const { rows: foundUsers } = await server.postgresClient.query(`
        SELECT * 
        FROM users
        WHERE email = $1
    `, [ req.body.email ]);

    const foundUser = foundUsers?.[0];

    if (!foundUser) {
        res.status(401).json({
            code: 401,
            message: "UNAUTHORIZED",
            details: "No user with that email was found"
        });
        return;
    }

    const { rows: foundExistingVerifications } = await server.postgresClient.query(`
        SELECT * 
        FROM email_verification
        WHERE user_id = $1
    `, [ foundUser.id ]);

    const foundExistingVerification = foundExistingVerifications?.[0];

    if (foundExistingVerification) {
        if (foundExistingVerification.last_sent !== null && foundExistingVerification.last_sent.getTime() + 2 * 60 * 1000 /* 2 minutes */ > Date.now()) {
            res.status(429).json({
                code: 429,
                message: "TOO_MANY_REQUESTS",
                details: "Wait 2 minutes before sending another verification email. Make sure to check your spam folder."
            });
            return;
        }
    }

    const randomBytes = crypto.randomBytes(20);
    const sha256Hash = crypto.createHash("sha256").update(randomBytes).digest("hex");

    try {
        const verifyUrl = server.config.base_account_server_url + "/v1/verify?t=" + sha256Hash;
        
        const sendEmail = await server.mgClient.messages.create(server.config.mailgun.domain, {
            from: `Mouthwash.gg Accounts <accounts@${server.config.mailgun.domain}>`,
            to: req.body.email,
            subject: "Mouthwash: Verify Email Address",
            text: "Click the following link verify your email address to login: " + verifyUrl,
            html: `Click the following link verify your email address to login: <a href="${verifyUrl}">${verifyUrl}</a>`
        });
    
        if (sendEmail.message === undefined) {
            res.status(500).json({
                code: 500,
                message: "INTERNAL_SERVER_ERROR",
                details: "Failed to send verification e-mail"
            });
            return;
        }
    } catch (e) {
        res.status(500).json({
            code: 500,
            message: "INTERNAL_SERVER_ERROR",
            details: "Failed to send verification e-mail"
        });
        return;
    }

    if (foundExistingVerification) {
        await server.postgresClient.query(`
            UPDATE email_verification
            SET last_sent = NOW(), id = $1, num_retries = num_retries + 1
            WHERE user_id = $2
        `, [ sha256Hash, foundExistingVerification.user_id ]);
    } else {
        await server.postgresClient.query(`
            INSERT INTO email_verification(id, user_id, last_sent, num_retries, verified_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [ sha256Hash, foundUser.user_id, new Date, 0, null ]);
    }

    return res.status(200).json({
        success: true,
        data: {}
    });
}