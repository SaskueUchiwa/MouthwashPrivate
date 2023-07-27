/// <reference types="svelte" />
/// <reference types="vite/client" />

export interface ApiKeyInfo {
    ClientIdString: string;
    ClientToken: string;
    DisplayName: string;
    Perks: string[];
    LoggedInDateTime: string;
}