import * as mediator from "mouthwash-mediator";
import * as bcrypt from "bcrypt";
import { morph, type } from "arktype";
import { BaseRoute } from "../BaseRoute";
import { DisplayNameAlreadyInUse, EmailAlreadyInUseError, InvalidBodyError } from "$/errors";

const trimDisplayName = morph("string", (s: string) => s.trim());

export const createUserRequest = type({
    email: "email",
    password: "8<=string<=128",
    display_name: ["string", "|>", trimDisplayName ]
});

export const displayNameValidator = type(/^[a-zA-Z0-9_\-]{3,32}$/);

export class AccountsRoute extends BaseRoute {
    @mediator.Endpoint(mediator.HttpMethod.POST, "/accounts/:client_id")
    async onCreateAccount(transaction: mediator.Transaction<{ client_id: string; }>) {
        const { data, problems } = createUserRequest(transaction.getBody());
        if (data === undefined) throw new InvalidBodyError(problems);
        const { data: dnData, problems: dnProblems } = displayNameValidator(data.display_name);
        if (dnData === undefined) throw new InvalidBodyError(dnProblems);

        const existingUserEmail = await this.server.accountsController.getUserByEmail(data.email);
        if (existingUserEmail) throw new EmailAlreadyInUseError(data.email, existingUserEmail.id);

        const existingUserDisplayName = await this.server.accountsController.getUserByDisplayName(data.display_name);
        if (existingUserDisplayName) throw new DisplayNameAlreadyInUse(data.display_name, existingUserDisplayName.id);

        const passwordHash = await bcrypt.hash(data.password, 12);
        const user = await this.server.accountsController.createUser(data.display_name, data.email, data.password);
    }
}