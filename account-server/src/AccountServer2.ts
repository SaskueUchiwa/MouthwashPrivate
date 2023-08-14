import * as mediator from "@/index";
import * as pg from "pg";
import FormData from "form-data";
import Mailgun from "mailgun.js";

import { IMailgunClient } from "mailgun.js/Interfaces";
import { BaseRoute } from "./routes/BaseRoute";
import { AccountServerConfig } from "./interfaces";
import { AccountsController } from "./controllers";

export class AccountServer {
    mediatorServer: mediator.MediatorServer<typeof BaseRoute>;
    postgresClient: pg.Client;
    mgClient: IMailgunClient;

    accountsController: AccountsController;

    constructor(public readonly config: AccountServerConfig) {
        this.mediatorServer = new mediator.MediatorServer({
            development: process.env.NODE_ENV === "development",
            crossDomains: ["*"],
            allowedHeaders: ["Authorization", "Client-Id", "Content-Type"]
        }, "account-server", this);

        this.postgresClient = new pg.Client({
            host: config.postgres.host,
            port: config.postgres.port,
            user: config.postgres.username,
            password: config.postgres.password,
            database: config.postgres.database
        });

        const mailgunInstance = new Mailgun(FormData);
        this.mgClient = mailgunInstance.client({ username: "api", key: config.mailgun.api_key, url: "https://api.eu.mailgun.net/" });

        this.accountsController = new AccountsController(this);
    }
}