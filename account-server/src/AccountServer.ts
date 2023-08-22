import * as mediator from "mouthwash-mediator";
import * as pg from "pg";
import FormData from "form-data";
import Mailgun from "mailgun.js";

import { IMailgunClient } from "mailgun.js/Interfaces";
import { AccountServerConfig } from "./interfaces";
import { AccountsController, CosmeticsController, InternalController, LobbiesController, SessionsController } from "./controllers";
import { BaseRoute } from "./routes/BaseRoute";
import { AuthRoute } from "./routes/v2/auth";
import { AccountsRoute } from "./routes/v2/accounts";
import { UsersRoute as InternalUsersRoute } from "./routes/v2/internal/users";
import { SessionsRoute } from "./routes/v2/internal/sessions";
import { VerifyRoute } from "./routes/v2/verify";
import { BundlesRoute } from "./routes/v2/bundles";
import { UsersRoute } from "./routes/v2/users";
import { GamesRoute } from "./routes/v2/games";

export class AccountServer {
    mediatorServer: mediator.MediatorServer<typeof BaseRoute>;
    postgresClient: pg.Client;
    mgClient: IMailgunClient|undefined;

    accountsController: AccountsController;
    cosmeticsController: CosmeticsController;
    internalController: InternalController;
    lobbiesController: LobbiesController;
    sessionsController: SessionsController;

    constructor(public readonly config: AccountServerConfig) {
        this.mediatorServer = new mediator.MediatorServer({
            development: process.env.NODE_ENV === "development",
            crossDomains: ["*"],
            allowedHeaders: ["Authorization", "Content-Type"],
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
        this.lobbiesController = new LobbiesController(this);
        this.sessionsController = new SessionsController(this);
    }

    async listen() {
        await this.postgresClient.connect();

        this.mediatorServer.registerRoute(AuthRoute);
        this.mediatorServer.registerRoute(AccountsRoute);
        this.mediatorServer.registerRoute(InternalUsersRoute);
        this.mediatorServer.registerRoute(SessionsRoute);
        this.mediatorServer.registerRoute(VerifyRoute);
        this.mediatorServer.registerRoute(BundlesRoute);
        this.mediatorServer.registerRoute(UsersRoute);
        this.mediatorServer.registerRoute(GamesRoute);

        this.mediatorServer.listen(this.config.port);
    }
}