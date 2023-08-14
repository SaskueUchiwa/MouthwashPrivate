import * as mediator from "mouthwash-mediator";
import * as pg from "pg";
import FormData from "form-data";
import Mailgun from "mailgun.js";

import { IMailgunClient } from "mailgun.js/Interfaces";
import { BaseRoute } from "./routes/BaseRoute";
import { AccountServerConfig } from "./interfaces";
import { AccountsController, CosmeticsController, InternalController, SessionsController } from "./controllers";
import { AuthRoute } from "./routes/v2/auth";
import { AccountsRoute } from "./routes/v2/accounts";
import { UsersRoute } from "./routes/v2/internal/users";
import { SessionsRoute } from "./routes/v2/internal/sessions";
import { VerifyRoute } from "./routes/v2/verify";

export class AccountServer {
    mediatorServer: mediator.MediatorServer<typeof BaseRoute>;
    postgresClient: pg.Client;
    mgClient: IMailgunClient|undefined;

    accountsController: AccountsController;
    cosmeticsController: CosmeticsController;
    internalController: InternalController;
    sessionsController: SessionsController;

    constructor(public readonly config: AccountServerConfig) {
        this.mediatorServer = new mediator.MediatorServer({
            development: process.env.NODE_ENV === "development",
            crossDomains: ["*"],
            allowedHeaders: ["Authorization", "Client-Id", "Content-Type"],
            pathPrefix: config.path_prefix
        }, "account-server", this);

        this.postgresClient = new pg.Client({
            host: config.postgres.host,
            port: config.postgres.port,
            user: config.postgres.username,
            password: config.postgres.password,
            database: config.postgres.database
        });

        if (config.mailgun) {
            const mailgunInstance = new Mailgun(FormData);
            this.mgClient = mailgunInstance.client({ username: "api", key: config.mailgun.api_key, url: "https://api.eu.mailgun.net/" });
        }

        this.accountsController = new AccountsController(this);
        this.cosmeticsController = new CosmeticsController(this);
        this.internalController = new InternalController;
        this.sessionsController = new SessionsController(this);
    }

    async listen() {
        await this.postgresClient.connect();

        this.mediatorServer.registerRoute(AuthRoute);
        this.mediatorServer.registerRoute(AccountsRoute);
        this.mediatorServer.registerRoute(UsersRoute);
        this.mediatorServer.registerRoute(SessionsRoute);
        this.mediatorServer.registerRoute(VerifyRoute);

        this.mediatorServer.listen(this.config.port);
    }
}