<script lang="ts">
    import * as shell from "@tauri-apps/api/shell";
    import { type BundleItem, loading, unavailable, user, accountUrl } from "../../stores/accounts";
    import FeaturedBundleThumbnail from "./FeaturedBundleThumbnail.svelte";

    export let bundleItems: BundleItem[];
    export let ownedItems: BundleItem[]|undefined;
    $: bundleInfo = bundleItems[0];
    
    const boughtAtFormat = new Intl.DateTimeFormat("en-US");

    $: doesAlreadyOwn = ownedItems && bundleItems.every(item => ownedItems.find(x => x.id === item.id));

    let loadingBuy = false;
    async function getPaymentUrl() {
        if ($user === loading || $user === unavailable)
            return;

        loadingBuy = true;
        const userCosmeticsRes = await fetch($accountUrl + "/api/v2/accounts/checkout_bundle?bundle_id=" + bundleInfo.bundle_id, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${$user.client_token}`
            }
        });
        loadingBuy = false;

        if (!userCosmeticsRes.ok) {
            return;
        }

        const json = await userCosmeticsRes.json();
        await shell.open(json.data.proceed_checkout_url);
    }
</script>

<div class="flex items-center gap-2 filter" class:grayscale={doesAlreadyOwn}>
    <FeaturedBundleThumbnail {bundleItems} {ownedItems} size={96} showDetails={false}/>
    <div class="flex flex-col gap-2">
        <div class="flex flex-col">
            <span>{bundleInfo.bundle_name}</span>
            <span class="text-[#806593] italic text-xs">
                Released on {boughtAtFormat.format(new Date(bundleInfo.added_at))}, {bundleItems.length} item{bundleItems.length === 1 ? "" : "s"}
            </span>
        </div>
        <button
            class="rounded-lg text-xs bg-[#378025] text-[#b0d4a7] px-4 py-1 hover:bg-[#2c6e1b] hover:text-[#94b88c] filter border-none font-inherit text-inherit text-inherit cursor-pointer"
            class:grayscale={loadingBuy || $user === loading || $user === unavailable || doesAlreadyOwn}
            class:pointer-events-none={loadingBuy || $user === loading || $user === unavailable || doesAlreadyOwn}
            on:click={getPaymentUrl}
        >
            {#if doesAlreadyOwn}
                You already own this bundle.
            {:else if $user !== loading && $user !== unavailable}
                Purchase for ${(bundleInfo.bundle_price_usd / 100).toFixed(2)}
            {:else}
                Login to purchase
            {/if}
        </button>
    </div>
</div>