<script lang="ts">
    import { createEventDispatcher } from "svelte";
    const dispatchEvent = createEventDispatcher();

    import { writable } from "svelte/store";
    import { type BundleItem, loading, unavailable, accountUrl, user } from "../../stores/accounts";
    import Marketplace from "./Marketplace.svelte";
    import PurchaseForm from "./PurchaseForm.svelte";
    import Storefront from "./Storefront.svelte";

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
    let purchasingBundle: BundleItem|undefined = undefined;
    let clientSecret: string|undefined = undefined;
    let checkoutSessionId: string|undefined = undefined;

    function openPurchaseForm(ev: CustomEvent<{ bundle: BundleItem; clientSecret: string; checkoutSessionId: string; }>) {
        purchasingBundle = ev.detail.bundle;
        clientSecret = ev.detail.clientSecret;
        checkoutSessionId = ev.detail.checkoutSessionId;
    }

    let storefront: Storefront|undefined = undefined;
    let marketplace: Marketplace|undefined = undefined;
    function refreshBundles() {
        getUserCosmetics();
        dispatchEvent("refresh-cosmetics");
    }
</script>

<div class="flex gap-4 self-stretch h-full">
    <div class="w-full flex flex-col bg-[#06000a] rounded-xl gap-4 p-4">
        {#if page === ""}
            <Storefront {ownedCosmetics} {allFeatureTags} bind:searchTerm bind:page bind:featureTag bind:this={storefront}/>
        {:else}
            <Marketplace
                {featureTag}
                {allFeatureTags}
                ownedItems={Array.isArray($ownedCosmetics) ? $ownedCosmetics : undefined}
                bind:page
                bind:selectedValuationIdxs
                bind:searchTerm
                on:open-purchase-form={openPurchaseForm}
                bind:this={marketplace}/>
        {/if}
    </div>
</div>
{#if purchasingBundle !== undefined && clientSecret !== undefined && checkoutSessionId !== undefined && $user !== loading && $user !== unavailable}
    <PurchaseForm
        {clientSecret}
        {purchasingBundle}
        {checkoutSessionId}
        user={$user}
        on:close={() => (clientSecret = undefined, purchasingBundle = undefined, checkoutSessionId = undefined)}
        on:refresh={refreshBundles}
        />
{/if}