import * as mediator from "mouthwash-mediator";
import * as bcrypt from "bcrypt";
import * as ark from "arktype";
import * as express from "express";

import {
    BundleAlreadyOwnedError,
    BundleNotFoundError,
    EmailAlreadyInUseError,
    InvalidBodyError,
    TooManyVerificationEmailsError,
    UserNotFoundError,
    DisplayNameAlreadyInUse,
    CheckoutSessionNotFound,
    PaymentNotFinalised,
    CheckoutSessionAlreadyFinished
} from "../../errors";

import { BaseRoute } from "../BaseRoute";

export const createUserRequestValidator = ark.type({
    email: "email",
    password: "8<=string<=128",
    display_name: /^[a-zA-Z0-9_\-]{3,24}$/
});

export const resendVerificationEmailRequestValidator = ark.type({
    email: "email"
});

export const checkoutBundleRequestValidator = ark.type({
    bundle_id: "uuid"
});

export const completeCheckoutRequestValidation = ark.type({
    checkout_session_id: "uuid"
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

        const passwordHash = await bcrypt.hash(data.password, 12);
        const doVerifyEmail = this.server.accountsController.canSendEmailVerification();
        const user = await this.server.accountsController.createUser(data.display_name, data.email, passwordHash, !doVerifyEmail);
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

        if (!this.server.accountsController.canSendEmailVerification())
            throw new mediator.InternalServerError(new Error("User sent email verification request, but Mailgun is not available on the server"));

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

    @mediator.Endpoint(mediator.HttpMethod.GET, "/v2/accounts/owned_bundles")
    async getOwnedBundles(transaction: mediator.Transaction<{}>) {
        const session = await this.server.sessionsController.validateAuthorization(transaction);
        const ownedBundles = await this.server.cosmeticsController.getAllBundlesOwned(session.user_id);

        transaction.respondJson(ownedBundles);
    }
    
    @mediator.Endpoint(mediator.HttpMethod.POST, "/v2/accounts/checkout_bundle")
    @mediator.Middleware(express.json())
    async createBundleCheckoutSession(transaction: mediator.Transaction<{}>) {
        if (!this.server.stripe) {
            throw new mediator.InternalServerError(new Error("Stripe not enabled on server."));
        }
        
        const { data, problems } = checkoutBundleRequestValidator(transaction.getBody());
        if (data === undefined) throw new InvalidBodyError(problems);

        const bundle = await this.server.cosmeticsController.getAvailableBundleById(data.bundle_id);
        if (bundle === undefined)
            throw new BundleNotFoundError(data.bundle_id);

        const stripeItem = await this.server.checkoutController.getBundleStripeItem(data.bundle_id);
        if (stripeItem === undefined)
            throw new BundleNotFoundError(data.bundle_id);

        const session = await this.server.sessionsController.validateAuthorization(transaction);
        const ownedItem = await this.server.cosmeticsController.doesUserOwnBundle(session.user_id, data.bundle_id);
        
        if (ownedItem)
            throw new BundleAlreadyOwnedError(data.bundle_id);
        
        const paymentIntent = await this.server.stripe.paymentIntents.create({
            amount: bundle.price_usd,
            currency: "USD"
        });

        const mouthwashCheckoutSession = await this.server.checkoutController.createCheckout(
            session.user_id,
            stripeItem.stripe_price_id,
            data.bundle_id,
            paymentIntent.id
        );

        if (!mouthwashCheckoutSession)
            throw new mediator.InternalServerError(new Error("Failed to create checkout session."));

        transaction.respondJson({ checkout_session_id: mouthwashCheckoutSession.id, client_secret: paymentIntent.client_secret });
    }
    
    @mediator.Endpoint(mediator.HttpMethod.POST, "/v2/accounts/checkout_bundle/complete")
    @mediator.Middleware(express.json())
    async completeBundleCheckoutSession(transaction: mediator.Transaction<{}>) {
        if (!this.server.stripe) {
            throw new mediator.InternalServerError(new Error("Stripe not enabled on server."));
        }

        const { data, problems } = completeCheckoutRequestValidation(transaction.getBody());
        if (data === undefined) throw new InvalidBodyError(problems);

        const checkoutSession = await this.server.checkoutController.getCheckoutById(data.checkout_session_id);
        if (!checkoutSession)
            throw new CheckoutSessionNotFound(data.checkout_session_id);

        if (checkoutSession.completed_at !== null || checkoutSession.canceled_at !== null)
            throw new CheckoutSessionAlreadyFinished(data.checkout_session_id);

        const paymentIntent = await this.server.stripe.paymentIntents.retrieve(checkoutSession.stripe_payment_intent_id);
        if (paymentIntent.status !== "succeeded")
            throw new PaymentNotFinalised;

        const ownership = await this.server.cosmeticsController.addOwnedBundle(checkoutSession.user_id, checkoutSession.bundle_id);
        if (!ownership)
            throw new mediator.InternalServerError(new Error("Could not grant bundles"));

        await this.server.checkoutController.setCheckoutCompleted(data.checkout_session_id);
        transaction.respondJson({});
    }
    
    @mediator.Endpoint(mediator.HttpMethod.POST, "/v2/accounts/checkout_bundle/cancel")
    @mediator.Middleware(express.json())
    async cancelBundleCheckoutSession(transaction: mediator.Transaction<{}>) {
        if (!this.server.stripe) {
            throw new mediator.InternalServerError(new Error("Stripe not enabled on server."));
        }

        const { data, problems } = completeCheckoutRequestValidation(transaction.getBody());
        if (data === undefined) throw new InvalidBodyError(problems);

        const checkoutSession = await this.server.checkoutController.getCheckoutById(data.checkout_session_id);
        if (!checkoutSession)
            throw new CheckoutSessionNotFound(data.checkout_session_id);
        
        if (checkoutSession.completed_at !== null || checkoutSession.canceled_at !== null)
            throw new CheckoutSessionAlreadyFinished(data.checkout_session_id);

        await this.server.checkoutController.setCheckoutCancelled(data.checkout_session_id);
        transaction.respondJson({});
    }
}