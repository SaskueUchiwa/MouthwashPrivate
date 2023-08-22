import { writable } from "svelte/store";

export const loading = Symbol("loading");
export const unavailable = Symbol("unavailable");
export const accountUrl = writable("http://localhost:8000");

export interface UserLogin {
    id: string;
    email: string;
    created_at: string;
    banned_until: string;
    muted_until: string;
    email_verified: boolean;
    display_name: string;
    client_token: string;
    logged_in_at: string;
    cosmetic_hat: number;
    cosmetic_pet: number;
    cosmetic_skin: number;
}

export interface Game {
    id: string;
    lobby_id: string;
    started_by: string;
    game_settings: any;
    started_at: string;
    ended_at: string;
    total_players: number|undefined;
}

export interface Player {
    id: string;
    lobby_id: string;
    user_id: string;
    did_win: boolean|null|undefined;
    role_name: string|null|undefined;
    cosmetic_color: number|null;
    cosmetic_name: string|null;
    role_alignment: string|null;
}

export type Deferred<T> = T|typeof loading|typeof unavailable;

export const user = writable<Deferred<UserLogin>>(loading);