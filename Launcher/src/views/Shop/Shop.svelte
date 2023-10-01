<script lang="ts">
    import { createEventDispatcher } from "svelte";
    const dispatchEvent = createEventDispatcher();

    import { writable } from "svelte/store";
    import { type Bundle, loading, unavailable, accountUrl, user } from "../../stores/accounts";
    import Marketplace from "./Marketplace.svelte";
    import PurchaseForm from "./PurchaseForm.svelte";
    import Storefront from "./Storefront.svelte";
    import PreviewBuyableBundlePopup from "./PreviewBuyableBundlePopup.svelte";

    let error = "";
    let ownedBundles = writable<Bundle[]|typeof loading|typeof unavailable>(loading);

    let selectedValuationIdxs = [];
    let searchTerm = "";
    let featureTag: string|undefined = undefined;
    
    async function getUserCosmetics() {
        if ($user === loading || $user === unavailable)
            return;

        ownedBundles.set(loading);
        const userCosmeticsRes = await fetch($accountUrl + "/api/v2/accounts/owned_bundles", {
            headers: {
                Authorization: `Bearer ${$user.client_token}`
            }
        });

        if (!userCosmeticsRes.ok) {
            error = "Could not get user cosmetics.";
            ownedBundles.set(unavailable);
            return;
        }

        const json = await userCosmeticsRes.json();
        ownedBundles.set(json.data);
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
    let purchasingBundle: Bundle|undefined = undefined;
    let clientSecret: string|undefined = undefined;
    let checkoutSessionId: string|undefined = undefined;
    
    let previewingBundle: Bundle|undefined = undefined;

    function onOpenPurchaseForm(ev: CustomEvent<{ bundle: Bundle; clientSecret: string; checkoutSessionId: string; }>) {
        purchasingBundle = ev.detail.bundle;
        clientSecret = ev.detail.clientSecret;
        checkoutSessionId = ev.detail.checkoutSessionId;
    }

    function onPreviewBundle(ev: CustomEvent<{ bundle: Bundle }>) {
        previewingBundle = ev.detail.bundle;
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
            <Storefront ownedCosmetics={ownedBundles} {allFeatureTags} bind:searchTerm bind:page bind:featureTag bind:this={storefront}/>
        {:else}
            <Marketplace
                {featureTag}
                {allFeatureTags}
                ownedBundles={Array.isArray($ownedBundles) ? $ownedBundles : undefined}
                bind:page
                bind:selectedValuationIdxs
                bind:searchTerm
                on:open-purchase-form={onOpenPurchaseForm}
                on:preview-bundle={onPreviewBundle}
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
{#if previewingBundle !== undefined}
    <PreviewBuyableBundlePopup
        bundle={previewingBundle} on:close={() => previewingBundle = undefined}/>
{/if}