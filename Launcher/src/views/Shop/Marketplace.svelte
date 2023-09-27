<script lang="ts">
    import { writable, type Writable } from "svelte/store";
    import BundleFilterBar from "./BundleFilterBar.svelte";
    import { loading, type BundleItem, unavailable, accountUrl, collectBundles } from "../../stores/accounts";
    import BuyableCosmeticBundle from "./BuyableCosmeticBundle.svelte";
    import { onMount } from "svelte";
    import Loader from "../../icons/Loader.svelte";

    export let ownedItems: BundleItem[]|undefined;
    export let page: String;
    export let selectedValuationIdxs: number[];
    export let searchTerm: string;
    export let featureTag: string|undefined;
    export let allFeatureTags: Record<string, string>;
    
    const allValuations = [ "GHOST", "CREWMATE", "IMPOSTOR", "POLUS" ];

    let availableCosmetics = writable<BundleItem[]|typeof loading|typeof unavailable>(loading);
    let availableBundles = writable<Map<string, BundleItem[]>|typeof loading|typeof unavailable>(loading);
    
    $: availableBundles.set($availableCosmetics === unavailable || $availableCosmetics === loading ? $availableCosmetics : collectBundles($availableCosmetics));

    async function getAvailableCosmetics() {
        availableCosmetics.set(loading);
        const userCosmeticsRes = await fetch($accountUrl + "/api/v2/bundles?"
            + (searchTerm.length > 0 ? "text_search=" + searchTerm : "")
            + (selectedValuationIdxs.length > 0 ? "&valuations=" + selectedValuationIdxs.map(i => allValuations[i]).join(",") : "")
            + (featureTag !== undefined ? "&feature_tag=" + featureTag : ""));

        if (!userCosmeticsRes.ok) {
            availableCosmetics.set(unavailable);
            return;
        }

        const json = await userCosmeticsRes.json();
        availableCosmetics.set(json.data);
    }

    onMount(() => {
        getAvailableCosmetics();
    });
</script>

<div class="flex flex-col gap-4 min-h-0">
    <div class="flex gap-2">
        <button class="text-xs rounded-lg bg-[#27063e] px-4 py-1 hover:bg-[#1C072B] hover:text-[#bba1ce] filter border-none font-inherit cursor-pointer"
            on:click={() => page = ""}
        >
            Back to Shop
        </button>
    </div>
    <span class="text-xl">
        Marketplace
        {#if featureTag !== undefined}
            ({allFeatureTags[featureTag]} Bundles)
        {:else}
            (All Bundles)
        {/if}
    </span>
    <BundleFilterBar {availableBundles} {getAvailableCosmetics} bind:selectedValuationIdxs bind:searchTerm/>
    <div class="overflow-y-auto min-h-0 flex-1">
        {#if $availableBundles === loading}
            <div class="flex-1 flex items-center justify-center text-[#806593]">
                <Loader size={32}/>
            </div>
        {:else if $availableBundles === unavailable}
            Could not get bundles available to purchase, try again later or contact support.
        {:else}
            <div class="grid grid-cols-2 grid-rows-auto gap-4">
                {#each $availableBundles as [, bundleItems ]}
                    <BuyableCosmeticBundle {bundleItems} {ownedItems}/>
                {/each}
            </div>
        {/if}
    </div>
</div>