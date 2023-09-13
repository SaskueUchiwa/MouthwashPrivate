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
    supabase: {
        base_api_url: string;
        service_role_token: string;
    }|false;
}