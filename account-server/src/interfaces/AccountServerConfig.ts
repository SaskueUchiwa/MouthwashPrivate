export interface AccountServerConfig {
    postgres: {
        host: string;
        port: number;
        username: string;
        password: string;
        database: string;
    };
    port: number;
    mailgun: {
        domain: string;
        api_key: string;
    }|false;
    base_account_server_url: string;
    path_prefix: string;
    stripe: {
        secret_key: string;
        signing_secret: string;
    }|false;
}