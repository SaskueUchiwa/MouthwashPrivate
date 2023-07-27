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
    };
    base_account_server_url: string;
}