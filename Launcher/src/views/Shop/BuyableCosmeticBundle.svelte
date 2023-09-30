<script lang="ts">
    import { createEventDispatcher } from "svelte";
    const dispatchEvent = createEventDispatcher();

    import { loading, unavailable, user, accountUrl, type Bundle } from "../../stores/accounts";
    import FeaturedBundleThumbnail from "./FeaturedBundleThumbnail.svelte";

    export let bundleInfo: Bundle;
    export let ownedBundles: Bundle[]|undefined;
    
    const boughtAtFormat = new Intl.DateTimeFormat("en-US");

    $: doesAlreadyOwn = ownedBundles && !!ownedBundles.find(x => x.id === bundleInfo.id);

    let loadingBuy = false;
    async function createPaymentIntent() {
        if ($user === loading || $user === unavailable)
            return;

        loadingBuy = true;
        const userCosmeticsRes = await fetch($accountUrl + "/api/v2/accounts/checkout_bundle", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${$user.client_token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                bundle_id: bundleInfo.id
            })
        });
        loadingBuy = false;

        if (!userCosmeticsRes.ok) {
            return;
        }

        const json = await userCosmeticsRes.json();
        dispatchEvent("open-purchase-form", { bundle: bundleInfo, clientSecret: json.data.client_secret, checkoutSessionId: json.data.checkout_session_id });
    }
</script>

<div class="flex items-center gap-2 filter" class:grayscale={doesAlreadyOwn}>
    <FeaturedBundleThumbnail {bundleInfo} ownedItems={ownedBundles} size={96} showDetails={false}/>
    <div class="flex flex-col gap-2">
        <div class="flex flex-col">
            <span>{bundleInfo.name}</span>
            <span class="text-[#806593] italic text-xs">
                Released on {boughtAtFormat.format(new Date(bundleInfo.added_at))}, {bundleInfo.num_items} item{bundleInfo.num_items === 1 ? "" : "s"}
            </span>
        </div>
        <button
            class="rounded-lg text-xs bg-[#378025] text-[#b0d4a7] px-4 py-1 hover:bg-[#2c6e1b] hover:text-[#94b88c] filter border-none font-inherit text-inherit text-inherit cursor-pointer"
            class:grayscale={loadingBuy || $user === loading || $user === unavailable || doesAlreadyOwn}
            class:pointer-events-none={loadingBuy || $user === loading || $user === unavailable || doesAlreadyOwn}
            on:click={createPaymentIntent}
        >
            {#if doesAlreadyOwn}
                You already own this bundle.
            {:else if $user !== loading && $user !== unavailable}
                Purchase for ${(bundleInfo.price_usd / 100).toFixed(2)}
            {:else}
                Login to purchase
            {/if}
        </button>
    </div>
</div>