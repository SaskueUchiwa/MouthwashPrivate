<script lang="ts">
    import { onMount } from "svelte";
    import Loader from "../../icons/Loader.svelte";
    import { type UserLogin, accountUrl, loading, unavailable, type Bundle } from "../../stores/accounts";
    import { writable } from "svelte/store";
    import CosmeticBundle from "./CosmeticBundle.svelte";
    import PreviewItemSelection from "../Preview/PreviewItemSelection.svelte";

    export let user: UserLogin;

    let error = "";
    let bundles = writable<(Bundle & { owned_at: string; })[]|typeof loading|typeof unavailable>(loading);

    let selectedItemId = "";

    export async function getUserCosmetics() {
        bundles.set(loading);
        const userCosmeticsRes = await fetch($accountUrl + "/api/v2/accounts/owned_bundles", {
            headers: {
                Authorization: `Bearer ${user.client_token}`
            }
        });

        if (!userCosmeticsRes.ok) {
            error = "Could not get user cosmetics.";
            bundles.set(unavailable);
            return;
        }

        const json = await userCosmeticsRes.json();
        bundles.set(json.data);
    }

    const officialBundle: Bundle & { preview_contents_url: string; } = {
        id: "",
        name: "Official",
        thumbnail_url: "",
        author_id: "",
        base_resource_id: 0,
        price_usd: 0,
        added_at: new Date,
        asset_bundle_id: "",
        stripe_item_id: "",
        valuation: "",
        tags: "",
        description: "",
        feature_tags: "",
        preview_contents_url: "/CosmeticOfficial.zip",
        preview_contents_hash: "",
        num_items: 0
    };

    onMount(() => {
        getUserCosmetics();
    });
</script>

{#if $bundles === loading}
    <div class="flex-1 flex items-center justify-center text-[#806593]">
        <Loader size={32}/>
    </div>
{:else if $bundles === unavailable || $bundles.length === 0 || error}
    You have no cosmetics.
{:else}
    <div class="flex flex-col gap-2 min-h-0 overflow-auto h-full w-full">
        {#each $bundles as bundleInfo}
            <div class="px-4">
                <PreviewItemSelection bundleInfo={officialBundle} bind:selectedItemId on:wear-item/>
            </div>
            <div class="flex flex-col gap-4">
                <CosmeticBundle {bundleInfo}/>
                <div class="px-4">
                    <PreviewItemSelection {bundleInfo} bind:selectedItemId on:wear-item/>
                </div>
            </div>
        {/each}
    </div>
{/if}