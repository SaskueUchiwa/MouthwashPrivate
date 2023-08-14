import * as mediator from "mouthwash-mediator";
import * as bcrypt from "bcrypt";
import * as ark from "arktype";
import { BaseRoute } from "../BaseRoute";
import { DisplayNameAlreadyInUse, EmailAlreadyInUseError, InvalidBodyError, UserNotFoundError } from "../../errors";

const trimDisplayName = ark.morph("string", (s: string) => s.trim());

export const createUserRequestValidator = ark.type({
    email: "email",
    password: "8<=string<=128",
    display_name: ["string", "|>", trimDisplayName ]
});

export const resendVerificationEmailRequestValidator = ark.type({
    email: "email"
});

export const displayNameValidator = ark.type(/^[a-zA-Z0-9_\-]{3,32}$/);

export class AccountsRoute extends BaseRoute {
    @mediator.Endpoint(mediator.HttpMethod.POST, "/v2/accounts")
    async onCreateAccount(transaction: mediator.Transaction<{}>) {
        const { data, problems } = createUserRequestValidator(transaction.getBody());
        if (data === undefined) throw new InvalidBodyError(problems);
        const { data: dnData, problems: dnProblems } = displayNameValidator(data.display_name);
        if (dnData === undefined) throw new InvalidBodyError(dnProblems);

        const existingUserEmail = await this.server.accountsController.getUserByEmail(data.email);
        if (existingUserEmail) throw new EmailAlreadyInUseError(data.email, existingUserEmail.id);

        const existingUserDisplayName = await this.server.accountsController.getUserByDisplayName(data.display_name);
        if (existingUserDisplayName) throw new DisplayNameAlreadyInUse(data.display_name, existingUserDisplayName.id);

        const passwordHash = await bcrypt.hash(data.password, 12);
        const user = await this.server.accountsController.createUser(data.display_name, data.email, passwordHash);
        if (user === undefined) throw new mediator.InternalServerError(new Error(`Failed to create user? (email=${data.email} display_name=${data.display_name})`));

        if (this.server.accountsController.canSendEmailVerification()) {
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

        const foundExistingVerification = await this.server.accountsController.getEmailVerificationIntentForUser(foundUser.id);
        if (foundExistingVerification === undefined) {
            const emailVerification = await this.server.accountsController.createEmailVerificationIntent(foundUser.id);
            if (emailVerification === undefined) throw new mediator.InternalServerError(new Error(`Failed to create email intent? (email=${data.email})`));
            await this.server.accountsController.sendEmailVerificationIntent(foundUser.email, emailVerification.id);
        } else {
            await this.server.accountsController.sendEmailVerificationIntent(foundUser.email, foundExistingVerification.id);
        }

        transaction.respondNoContent();
    }
}