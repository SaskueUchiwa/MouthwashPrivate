CREATE TABLE "user"(
    "uuid" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(255) NOT NULL,
    "client_token" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    "banned_until" TIMESTAMP(0) WITHOUT TIME ZONE NULL,
    "muted_until" TIMESTAMP(0) WITHOUT TIME ZONE NULL,
    "game_settings" JSON NOT NULL
);
ALTER TABLE
    "user" ADD PRIMARY KEY("uuid");