import * as mediator from "mouthwash-mediator";
import * as bcrypt from "bcrypt";
import * as ark from "arktype";
import * as amongus from "@skeldjs/client";
import { BaseRoute } from "../BaseRoute";
import { DisplayNameAlreadyInUse, EmailAlreadyInUseError, InvalidBodyError, TooManyVerificationEmailsError, Unauthorized, UserNotFoundError } from "../../errors";
import { updateCosmeticsRequestValidator } from "./internal/users";
import { BundleItem } from "../../controllers";

export const createUserRequestValidator = ark.type({
    email: "email",
    password: "8<=string<=128",
    display_name: /^[a-zA-Z0-9_\-]{3,32}$/
});

export const resendVerificationEmailRequestValidator = ark.type({
    email: "email"
});

// typescript only does unidirection for string enums, so we'll reverse them here
// we use this to check if a cosmetic hat is in the game or not
const amongUsHatsOfficial: Set<string> = new Set(Object.values(amongus.Hat));
const amongUsPetsOfficial: Set<string> = new Set(Object.values(amongus.Pet));
const amongUsSkinsOfficial: Set<string> = new Set(Object.values(amongus.Skin));
const amongUsVisorsOfficial: Set<string> = new Set(Object.values(amongus.Visor));
const amongUsNameplatesOfficial: Set<string> = new Set(Object.values(amongus.Nameplate));

export class AccountsRoute extends BaseRoute {
    @mediator.Endpoint(mediator.HttpMethod.POST, "/v2/accounts")
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
    async getOwnedItems(transaction: mediator.Transaction<{}>) {
        const session = await this.server.sessionsController.validateAuthorization(transaction);
        const ownedItems = await this.server.cosmeticsController.getAllCosmeticItemsOwnedByUser(session.user_id);

        console.log(ownedItems);

        transaction.respondJson(ownedItems);
    }

    assertHasItemOfType(ownedItemMap: Map<string, BundleItem>, itemAmongUsId: string, itemType: string) {
        const bundleItem = ownedItemMap.get(itemAmongUsId);
        if (bundleItem && bundleItem.type === itemType) return;

        throw new Unauthorized();
    }

    @mediator.Endpoint(mediator.HttpMethod.PUT, "/v2/accounts/cosmetics")
    async saveSelectedCosmetics(transaction: mediator.Transaction<{}>) {
        const session = await this.server.sessionsController.validateAuthorization(transaction);
        const ownedItems = await this.server.cosmeticsController.getAllCosmeticItemsOwnedByUser(session.user_id);
        
        const { data, problems } = updateCosmeticsRequestValidator(transaction.getBody());
        if (data === undefined) throw new InvalidBodyError(problems);

        const ownedItemMap: Map<string, BundleItem> = new Map;
        for (const item of ownedItems) {
            ownedItemMap.set(item.among_us_id, item);
        }

        if (!amongUsHatsOfficial.has(data.cosmetic_hat)) this.assertHasItemOfType(ownedItemMap, data.cosmetic_hat, "HAT");
        if (!amongUsPetsOfficial.has(data.cosmetic_pet)) this.assertHasItemOfType(ownedItemMap, data.cosmetic_pet, "PET");
        if (!amongUsSkinsOfficial.has(data.cosmetic_skin)) this.assertHasItemOfType(ownedItemMap, data.cosmetic_skin, "SKIN");
        if (!amongUsVisorsOfficial.has(data.cosmetic_visor)) this.assertHasItemOfType(ownedItemMap, data.cosmetic_visor, "VISOR");
        if (!amongUsNameplatesOfficial.has(data.cosmetic_nameplate)) this.assertHasItemOfType(ownedItemMap, data.cosmetic_nameplate, "NAMEPLATE");
    
        const success = await this.server.cosmeticsController.setPlayerCosmetics(session.user_id, data.cosmetic_hat, data.cosmetic_pet, data.cosmetic_skin, data.cosmetic_color, data.cosmetic_visor, data.cosmetic_nameplate);
        if (!success) throw new mediator.InternalServerError(new Error(`Failed to set player cosmetics? user_id=${session.user_id}`));

        transaction.respondJson({});
    }
}