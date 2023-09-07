<script lang="ts">
    import { writable } from "svelte/store";
    import { type BundleItem, loading, unavailable, accountUrl, user } from "../../stores/accounts";
    import { onMount } from "svelte";
    import Loader from "../../icons/Loader.svelte";
    import BuyableCosmeticBundle from "./BuyableCosmeticBundle.svelte";

    let error = "";
    let ownedCosmetics = writable<BundleItem[]|typeof loading|typeof unavailable>(loading);

    let availableCosmetics = writable<BundleItem[]|typeof loading|typeof unavailable>(loading);
    let availableBundles = writable<Map<string, BundleItem[]>|typeof loading|typeof unavailable>(loading);

    function collectBundles(items: BundleItem[]) {
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

    $: availableBundles.set($availableCosmetics === unavailable || $availableCosmetics === loading ? $availableCosmetics : collectBundles($availableCosmetics));

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
    
    async function getAvailableCosmetics() {
        availableCosmetics.set(loading);
        const userCosmeticsRes = await fetch($accountUrl + "/api/v2/bundles");

        if (!userCosmeticsRes.ok) {
            error = "Could not get available cosmetics.";
            availableCosmetics.set(unavailable);
            return;
        }

        const json = await userCosmeticsRes.json();
        availableCosmetics.set(json.data);
    }

    $: if ($user !== loading && $user !== unavailable) {
        getUserCosmetics();
    }

    onMount(() => {
        getAvailableCosmetics();
    });
</script>

<div class="flex gap-4 self-stretch h-full">
    <div class="w-full flex flex-col bg-[#06000a] rounded-xl gap-4 p-4">
        {#if $availableBundles === loading}
            <div class="flex-1 flex items-center justify-center text-[#806593]">
                <Loader size={32}/>
            </div>
        {:else if $availableBundles === unavailable || error}
            You have no cosmetics.
        {:else}
            <div class="grid grid-rows-auto grid-cols-2 gap-8">
                {#each [...$availableBundles.entries()] as [ bundleId, bundleItems ]}
                    <BuyableCosmeticBundle
                        {bundleItems}
                        ownedItems={$ownedCosmetics === loading || $ownedCosmetics === unavailable ? undefined : $ownedCosmetics}
                        />
                {/each}
            </div>
        {/if}
    </div>
</div>