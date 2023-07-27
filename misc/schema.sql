create table users
(
    client_id     uuid not null
        constraint users_pk
            primary key,
    email         varchar,
    password_hash text,
    display_name  varchar,
    created_at    timestamp,
    banned_until  timestamp,
    muted_until   timestamp,
    game_settings json,
    is_verified bool
);

alter table users
    owner to postgres;

create unique index users_email_uindex
    on users (email);

create table sessions
(
    client_id    varchar,
    client_token text not null
        constraint sessions_pk
            primary key,
    ip           varchar
);

alter table sessions
    owner to postgres;

create index sessions_client_token_ip_index
    on sessions (client_token, ip);

