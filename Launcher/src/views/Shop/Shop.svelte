<script lang="ts">
  import Storefront from './Storefront.svelte';

    import { writable } from "svelte/store";
    import { type BundleItem, loading, unavailable, accountUrl, user } from "../../stores/accounts";
    import { onMount } from "svelte";
    import Loader from "../../icons/Loader.svelte";
    import Marketplace from './Marketplace.svelte';

    let error = "";
    let ownedCosmetics = writable<BundleItem[]|typeof loading|typeof unavailable>(loading);

    let selectedValuationIdxs = [];
    let searchTerm = "";
    let featureTag: string|undefined = undefined;
    
    async function getUserCosmetics() {
        if ($user === loading || $user === unavailable)
            return;

        ownedCosmetics.set(loading);
        const userCosmeticsRes = await fetch($accountUrl + "/api/v2/accounts/owned_bundles", {
            headers: {
                Authorization: `Bearer ${$user.client_token}`
            }
        });

        if (!userCosmeticsRes.ok) {
            error = "Could not get user cosmetics.";
            ownedCosmetics.set(unavailable);
            return;
        }

        const json = await userCosmeticsRes.json();
        ownedCosmetics.set(json.data);
    }

    $: if ($user !== loading && $user !== unavailable) {
        getUserCosmetics();
    }

    const allFeatureTags: Record<string, string> = {
        FEATURED: "Featured",
        NEW_RELEASE: "New Release",
        CLASSIC: "Classic",
        POPULAR: "Popular",
        PGG_REWRITTEN: "PGG: Rewritten",
        AMONG_US: "Among Us",
        SEASONAL: "Seasonal",
        PROMOTIONAL: "Promotional"
    };

    let page: ""|"Marketplace" = "";
</script>

<div class="flex gap-4 self-stretch h-full">
    <div class="w-full flex flex-col bg-[#06000a] rounded-xl gap-4 p-4">
        {#if page === ""}
            <Storefront {ownedCosmetics} {allFeatureTags} bind:searchTerm bind:page bind:featureTag/>
        {:else}
            <Marketplace
                {featureTag}
                {allFeatureTags}
                ownedItems={Array.isArray($ownedCosmetics) ? $ownedCosmetics : undefined}
                bind:page
                bind:selectedValuationIdxs
                bind:searchTerm/>
        {/if}
    </div>
</div>