import * as mediator from "mouthwash-mediator";
import { AccountServer } from "$/AccountServer2";

export interface User {
    id: string;
    email: string;
    password_hash: string;
    created_at: string;
    banned_until: string;
    muted_until: string;
    game_settings: any;
    email_verified: string;
    display_name: string;
    cosmetic_hat: string;
    cosmetic_pet: string;
    comsetic_skin: string;
}

export class AccountsController {
    constructor(public readonly server: AccountServer) {}

    async getUserByEmail(email: string) {
        const { rows: foundUsers } = await this.server.postgresClient.query(`
            SELECT *
            FROM users
            WHERE email = $1
        `, [ email ]);

        return foundUsers[0] as User|undefined;
    }

    async getUserByDisplayName(displayName: string) {
        const { rows: foundUsers } = await this.server.postgresClient.query(`
            SELECT *
            FROM users
            WHERE display_name = $1
        `, [ displayName ]);

        return foundUsers[0] as User|undefined;
    }

    async createUser(displayName: string, email: string, passwordHash: string) {
        const { rows: createdUsers } = await this.server.postgresClient.query(`
            INSERT INTO users(id, email, password_hash, created_at, banned_until, muted_until, game_settings, email_verified, cosmetic_hat, cosmetic_pet, cosmetic_skin, display_name)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `, [ crypto.randomUUID(), email, passwordHash, new Date(), null, null, {}, false, 0, 0, 0, displayName ]);

        return createdUsers[0] as User|undefined;
    }

    async createEmailVerificationIntent(userId: string) {
        const randomBytes = crypto.randomBytes(20);
        const sha256Hash = crypto.createHash("sha256").update(randomBytes).digest("hex");
    
        await server.postgresClient.query(`
            INSERT INTO email_verification(id, user_id, last_sent, num_retries, verified_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [ sha256Hash, createdUser.id, new Date, 0, null ]);
    
        try {
            const verifyUrl = server.config.base_account_server_url + "/api/v1/verify?t=" + sha256Hash;
            
            const sendEmail = await server.mgClient.messages.create(server.config.mailgun.domain, {
                from: `Mouthwash.gg Accounts <accounts@${server.config.mailgun.domain}>`,
                to: req.body.email,
                subject: "Mouthwash: Verify Email Address",
                text: "Click the following link verify your email address to login: " + verifyUrl,
                html: `Click the following link verify your email address to login: <a href="${verifyUrl}">${verifyUrl}</a>`
            });
        
            if (sendEmail.message === undefined) {
                throw new mediator.InternalServerError()
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
    }
}