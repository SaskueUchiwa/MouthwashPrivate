import * as mediator from "mouthwash-mediator";
import * as crypto from "crypto";
import { AccountServer } from "../AccountServer";
import { IMailgunClient } from "mailgun.js/Interfaces";
import { DeclareSafeKeys } from "../types/DeclareSafeKeys";
import { MailgunEmailProvider, MailjetEmailProvider } from "./email";

export interface User {
    id: string;
    email: string;
    password_hash: string;
    created_at: string;
    banned_until: string;
    muted_until: string;
    game_settings: any;
    email_verified: boolean;
    display_name: string;
    cosmetic_hat: string;
    cosmetic_pet: string;
    cosmetic_skin: string;
}

export type SafeUser = DeclareSafeKeys<User, "id"|"email"|"created_at"|"banned_until"|"muted_until"|"email_verified"|"display_name"|"cosmetic_hat"|"cosmetic_pet"|"cosmetic_skin">;
export type PublicUser = DeclareSafeKeys<SafeUser, "id"|"created_at"|"display_name"|"cosmetic_hat"|"cosmetic_pet"|"cosmetic_skin">;

export interface EmailVerification {
    id: string;
    user_id: string;
    last_sent: Date;
    num_retries: string;
    verified_at: Date|null;
}

export class AccountsController {
    mailgunProvider: MailgunEmailProvider;
    mailjetProvider: MailjetEmailProvider;

    constructor(public readonly server: AccountServer) {
        this.mailgunProvider = new MailgunEmailProvider(this.server);
        this.mailjetProvider = new MailjetEmailProvider(this.server);
    }

    getEmailProvider() {
        if (this.mailgunProvider.isAvailable()) return this.mailgunProvider;
        if (this.mailjetProvider.isAvailable()) return this.mailjetProvider;

        return undefined;
    }

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

    async getUserById(userId: string) {
        const { rows: foundUsers } = await this.server.postgresClient.query(`
            SELECT *
            FROM users
            WHERE id = $1
        `, [ userId ]);

        return foundUsers[0] as User|undefined;
    }

    async createUser(displayName: string, email: string, passwordHash: string, emailVerified: boolean) {
        const { rows: createdUsers } = await this.server.postgresClient.query(`
            INSERT INTO users(id, email, password_hash, created_at, banned_until, muted_until, game_settings, email_verified, cosmetic_hat, cosmetic_pet, cosmetic_skin, display_name)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `, [ crypto.randomUUID(), email, passwordHash, new Date(), null, null, {}, emailVerified, 0, 0, 0, displayName ]);

        return createdUsers[0] as User|undefined;
    }

    async sendEmailVerificationIntent(email: string, verificationId: string) {
        const provider = this.getEmailProvider();
        if (!provider) throw new Error("Email verification not set up on this server.");

        await this.server.postgresClient.query(`
            UPDATE email_verification
            SET last_sent = NOW()
            WHERE id = $1
        `, [ verificationId ]);
        try {
            const verifyUrl = this.server.config.base_account_server_url + "/api/v2/verify?t=" + verificationId;
            await provider.sendVerificationEmail(email, verifyUrl);
        } catch (e: any) {
            this.server.mediatorServer.logger.error(e);
            throw new mediator.InternalServerError(new Error("Failed to send verification e-mail"));
        }
    }

    canSendEmailVerification() {
        return !!this.getEmailProvider();
    }

    async createEmailVerificationIntent(userId: string) {
        const randomBytes = crypto.randomBytes(20);
        const sha256Hash = crypto.createHash("sha256").update(randomBytes).digest("hex");
    
        const { rows: createdEmailVerifications } = await this.server.postgresClient.query(`
            INSERT INTO email_verification(id, user_id, last_sent, num_retries, verified_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [ sha256Hash, userId, new Date, 0, null ]);

        return createdEmailVerifications?.[0] as EmailVerification|undefined;
    }

    async getEmailVerificationIntentForUser(userId: string) {
        const { rows: foundEmailVerifications } = await this.server.postgresClient.query(`
            SELECT * 
            FROM email_verification
            WHERE user_id = $1
        `, [ userId ]);

        return foundEmailVerifications?.[0] as EmailVerification|undefined;
    }

    async getEmailVerificationIntentById(verificationId: string) {
        const { rows: foundEmailVerifications } = await this.server.postgresClient.query(`
            SELECT * 
            FROM email_verification
            WHERE id = $1
        `, [ verificationId ]);

        return foundEmailVerifications?.[0] as EmailVerification|undefined;
    }

    async setUserEmailVerified(userId: string, verificationId: string) {
        const { rows: updatedUsers } = await this.server.postgresClient.query(`
            UPDATE users
            SET email_verified = TRUE
            WHERE id = $1
            RETURNING *
        `, [ userId ]);
        if (updatedUsers.length === 0) return false;
        const { rows: updatedVerifications } = await this.server.postgresClient.query(`
            UPDATE email_verification
            SET verified_at = NOW()
            WHERE id = $1
            RETURNING *
        `, [ verificationId ]);
        return updatedVerifications.length > 0;
    }

    async setPlayerGameSettings(userId: string, gameSettings: any) {
        const rowsUpdated = await this.server.postgresClient.query(`
            UPDATE users
            SET game_settings = $1
            WHERE id = $2
            RETURNING *
        `, [ gameSettings, userId ]);

        return rowsUpdated.rowCount > 0;
    }
}