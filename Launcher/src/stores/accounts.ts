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

export interface GameLobbyInfo {
    id: string;
    lobby_id: string;
    started_by: string;
    game_settings: any;
    started_at: string;
    ended_at: string|null;
    total_players: number|undefined;
    game_code: string;
    lobby_destroyed_at: string|null;
    did_win: boolean|null;
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

export interface BundleItem {
    id: string;
    bundle_id: string;
    name: string;
    bundle_name: string;
    among_us_id: number;
    resource_path: number;
    type: "HAT"|"PET";
    resource_id: number;
    thumbnail_url: string;
    owned_at: string;
    added_at: string;
    bundle_price_usd: number;
    valuation: string;
    bundle_feature_tags: string;
}

export type Deferred<T> = T|typeof loading|typeof unavailable;

export const user = writable<Deferred<UserLogin>>(loading);

export function collectBundles(items: BundleItem[]) {
    const map: Map<string, BundleItem[]> = new Map;
    for (const item of items) {
        const existingBundle = map.get(item.bundle_id);
        if (existingBundle) {
            existingBundle.push(item);
            continue;
        }
        map.set(item.bundle_id, [ item ]);
    }
    return map;
}