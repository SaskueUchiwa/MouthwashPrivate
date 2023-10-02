<script lang="ts">
    import { createEventDispatcher } from "svelte";
    const dispatchEvent = createEventDispatcher();

    import { get } from "svelte/store";
    import ArrowLeftRect from "../../icons/ArrowLeftRect.svelte";
    import ArrowRight from "../../icons/ArrowRight.svelte";
    import Link from "../../icons/Link.svelte";
    import { accountUrl, type UserLogin } from "../../stores/accounts";
    import Swatch from "../../icons/Swatch.svelte";
    import type { LoadedCosmeticImages } from "../../lib/previewTypes";
    import CharacterOutfitPreview from "../Preview/CharacterOutfitPreview.svelte";

    export let user: UserLogin;
    export let page: ""|"games";

    let hatCosmetic: LoadedCosmeticImages|undefined = undefined;
    let skinCosmetic: LoadedCosmeticImages|undefined = undefined;
    let visorCosmetic: LoadedCosmeticImages|undefined = undefined;

    export function wearItem(cosmeticItem: LoadedCosmeticImages) {
        if (cosmeticItem.asset.type === "HAT") {
            hatCosmetic = cosmeticItem;
        } else if (cosmeticItem.asset.type === "SKIN") {
            skinCosmetic = cosmeticItem;
        } else if (cosmeticItem.asset.type === "VISOR") {
            visorCosmetic = cosmeticItem;
        }
    }

    async function logoutAccount() {
        const logoutResponse = await fetch(get(accountUrl) + "/api/v2/auth/logout", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${user.client_token}`
            }
        });

        dispatchEvent("logout");

        if (!logoutResponse.ok) {
            try {
                const json = await logoutResponse.json();
                console.log("Failed to logout", json);
            } catch (e: any) {
                console.log("Failed to logout", logoutResponse.status, e);
            }
            return;
        }
    }

    const joinDateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
</script>

<div class="flex-1 flex flex-col items-center gap-4">
    <div class="flex flex-col items-center gap-2">
        <CharacterOutfitPreview {hatCosmetic} {skinCosmetic} {visorCosmetic} playerColor={user.cosmetic_color}/>
        <span class="text-stroke-black text-white italic text-2xl">{user.display_name}</span>
    </div>
    <span class="text-text-300 italic">Joined on {joinDateFormat.format(new Date(user.created_at))}</span>
    <div class="flex-1 flex flex-col items-stretch w-full gap-2">
        <button
            class="rounded-3xl bg-card-300 text-text-200 py-1 flex items-center justify-center gap-2 transition-colors duration-100 filter hover:bg-card-300 hover:text-text-300"
            class:pointer-events-none={page === ""}
            class:grayscale={page === ""}
            on:click={() => dispatchEvent("set-page", "")}
        >
            <span class="italic">Cosmetics</span>
            <Swatch size={16}/>
        </button>
        <button
            class="rounded-3xl bg-card-300 text-text-200 py-1 flex items-center justify-center gap-2 transition-colors duration-100 filter hover:bg-card-300 hover:text-text-300"
            class:pointer-events-none={page === "games"}
            class:grayscale={page === "games"}
            on:click={() => dispatchEvent("set-page", "games")}
        >
            <span class="italic">Recent Games</span>
            <ArrowRight size={16}/>
        </button>
        <div class="mt-auto order-2 flex flex-col items-stretch w-full gap-2">
            <button class="rounded-3xl border-2 border-surface-100 text-text-300 py-1 flex items-center justify-center gap-2 transition-colors duration-100 hover:border-card-300 hover:text-text-200">
                <span class="italic">Copy Link to Profile</span>
                <Link size={16}/>
            </button>
            <button
                class="rounded-3xl bg-transparent border-2 border-rose-800 text-rose-400 py-1 flex items-center justify-center
                    gap-2 transition-colors hover:bg-rose-800/25 hover:text-rose-500"
                on:click={logoutAccount}
            >
                <span class="italic">Logout</span>
                <ArrowLeftRect size={16}/>
            </button>
        </div>
    </div>
</div>