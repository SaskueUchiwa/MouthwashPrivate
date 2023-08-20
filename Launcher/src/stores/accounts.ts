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
}

export type Deferred<T> = T|typeof loading|typeof unavailable;

export const user = writable<Deferred<UserLogin>>(loading);