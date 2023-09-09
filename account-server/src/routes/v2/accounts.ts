import * as mediator from "mouthwash-mediator";
import * as crypto from "crypto";
import * as ark from "arktype";
import express from "express";
import { BaseRoute } from "../BaseRoute";
import { DisplayNameAlreadyInUse, EmailAlreadyInUseError, EmailAlreadyVerifiedError, InvalidBodyError, PasswordResetIntentNotFoundError, TooManyVerificationEmailsError, UserNotFoundError } from "../../errors";
import { InvalidPasswordResetCode } from "../../errors/InvalidPasswordResetCode";

export const createUserRequestValidator = ark.type({
    email: "email",
    password: "8<=string<=128",
    display_name: /^[a-zA-Z0-9_\-]{3,32}$/
});

export const resendVerificationEmailRequestValidator = ark.type({
    email: "email"
});

export const resetPasswordRequestValidator = ark.type({
    email: "email"
});

export const resetPasswordVerifyRequestValidator = ark.type({
    email: "email",
    reset_id: "string",
    reset_code: "string",
    new_password: "8<=string<=128"
});

export class AccountsRoute extends BaseRoute {
    @mediator.Endpoint(mediator.HttpMethod.POST, "/v2/accounts")
    @mediator.Middleware(express.json())
    async onCreateAccount(transaction: mediator.Transaction<{}>) {
        const { data, problems } = createUserRequestValidator(transaction.getBody());
        if (data === undefined) throw new InvalidBodyError(problems);

        const existingUserEmail = await this.server.accountsController.getUserByEmail(data.email);
        if (existingUserEmail) throw new EmailAlreadyInUseError(data.email, existingUserEmail.id);

        const existingUserDisplayName = await this.server.accountsController.getUserByDisplayName(data.display_name);
        if (existingUserDisplayName) throw new DisplayNameAlreadyInUse(data.display_name, existingUserDisplayName.id);

        const doVerifyEmail = this.server.accountsController.canSendEmailVerification();
        const user = await this.server.accountsController.createUser(data.display_name, data.email, data.password, !doVerifyEmail);
        if (user === undefined) throw new mediator.InternalServerError(new Error(`Failed to create user? (email=${data.email} display_name=${data.display_name})`));

        if (doVerifyEmail) {
            const emailVerification = await this.server.accountsController.createEmailVerificationIntent(user.id);
            if (emailVerification === undefined) throw new mediator.InternalServerError(new Error(`Failed to create email intent? (email=${data.email})`));
            await this.server.accountsController.sendEmailVerificationIntent(user.email, emailVerification.id);
            transaction.respondJson({ user, verify_email: true });
        } else {
            transaction.respondJson({ user, verify_email: false });
        }
    }

    @mediator.Endpoint(mediator.HttpMethod.POST, "/v2/accounts/resend_verification")
    @mediator.Middleware(express.json())
    async onResendEmailVerification(transaction: mediator.Transaction<{}>){ 
        const { data, problems } = resendVerificationEmailRequestValidator(transaction.getBody());
        if (data === undefined) throw new InvalidBodyError(problems);

        const foundUser = await this.server.accountsController.getUserByEmail(data.email);
        if (foundUser === undefined) throw new UserNotFoundError({ email: data.email });

        if (foundUser.email_verified) throw new EmailAlreadyVerifiedError(data.email);

        if (!this.server.accountsController.canSendEmailVerification())
            throw new mediator.InternalServerError(new Error("User sent email verification request, but email provider is not available on the server"));

        const foundExistingVerification = await this.server.accountsController.getEmailVerificationIntentForUser(foundUser.id);
        if (foundExistingVerification === undefined) {
            const emailVerification = await this.server.accountsController.createEmailVerificationIntent(foundUser.id);
            if (emailVerification === undefined) throw new mediator.InternalServerError(new Error(`Failed to create email intent? (email=${data.email})`));
            await this.server.accountsController.sendEmailVerificationIntent(foundUser.email, emailVerification.id);
        } else {
            if (foundExistingVerification.last_sent.getTime() > Date.now() - 2 * 60 * 1000)
                throw new TooManyVerificationEmailsError(foundUser.email, foundUser.id);

            await this.server.accountsController.sendEmailVerificationIntent(foundUser.email, foundExistingVerification.id);
        }

        transaction.respondJson({});
    }

    @mediator.Endpoint(mediator.HttpMethod.POST, "/v2/accounts/reset_password")
    @mediator.Middleware(express.json())
    async onResetPassword(transaction: mediator.Transaction<{}>){ 
        const { data, problems } = resetPasswordRequestValidator(transaction.getBody());
        if (data === undefined) throw new InvalidBodyError(problems);

        const foundUser = await this.server.accountsController.getUserByEmail(data.email);
        if (foundUser === undefined) {
            transaction.respondJson({ reset_id: crypto.randomUUID() }); // create fake reset id for user who uses a non-existent user email address
            return;
        }

        if (!this.server.accountsController.canValidatePasswordReset())
            throw new mediator.InternalServerError(new Error("User sent password reset request, but email provider is not available on the server"));

        const resetPasswordIntent = await this.server.accountsController.createResetPasswordIntent(foundUser.id);
        if (!resetPasswordIntent)
            throw new mediator.InternalServerError(new Error("User sent password reset request, but password intent was not created"));

        await this.server.accountsController.sendResetPasswordIntent(foundUser.email, foundUser.display_name, resetPasswordIntent.code);

        transaction.respondJson({ reset_id: resetPasswordIntent.id });
    }

    @mediator.Endpoint(mediator.HttpMethod.POST, "/v2/accounts/verify_reset_password")
    @mediator.Middleware(express.json())
    async onResetPasswordVerify(transaction: mediator.Transaction<{}>){ 
        const { data, problems } = resetPasswordVerifyRequestValidator(transaction.getBody());
        if (data === undefined) throw new InvalidBodyError(problems);

        const foundUser = await this.server.accountsController.getUserByEmail(data.email);
        if (foundUser === undefined)
            throw new InvalidPasswordResetCode(data.reset_id); // throw fake error for user who uses non-existent user email address

        const resetIntent = await this.server.accountsController.getResetPasswordIntentById(data.reset_id);
        if (!resetIntent || resetIntent.user_id !== foundUser.id)
            throw new PasswordResetIntentNotFoundError(data.reset_id);

        if (resetIntent.code !== data.reset_code)
            throw new InvalidPasswordResetCode(data.reset_id);

        await this.server.accountsController.acceptResetPasswordIntent(data.reset_id, foundUser.id, data.new_password);

        transaction.respondJson({});
    }

    @mediator.Endpoint(mediator.HttpMethod.GET, "/v2/accounts/owned_bundles")
    async getOwnedBundles(transaction: mediator.Transaction<{}>) {
        const session = await this.server.sessionsController.validateAuthorization(transaction);
        const ownedBundles = await this.server.cosmeticsController.getAllCosmeticItemsOwnedByUser(session.user_id);

        transaction.respondJson(ownedBundles.map(bundle => ({ ...bundle, asset_bundle_url: undefined })));
    }
}