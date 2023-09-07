<script lang="ts">
    import { onMount } from "svelte";
    import Loader from "../../icons/Loader.svelte";
    import { type UserLogin, type BundleItem, accountUrl, loading, unavailable } from "../../stores/accounts";
    import { writable } from "svelte/store";
    import CosmeticBundle from "./CosmeticBundle.svelte";

    export let user: UserLogin;

    let error = "";
    let cosmetics = writable<BundleItem[]|typeof loading|typeof unavailable>(loading);
    let bundles = writable<Map<string, BundleItem[]>|typeof loading|typeof unavailable>(loading);

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

    $: bundles.set($cosmetics === unavailable || $cosmetics === loading ? $cosmetics : collectBundles($cosmetics));

    async function getUserCosmetics() {
        cosmetics.set(loading);
        const userCosmeticsRes = await fetch($accountUrl + "/api/v2/accounts/owned_bundles", {
            headers: {
                Authorization: `Bearer ${user.client_token}`
            }
        });

        if (!userCosmeticsRes.ok) {
            error = "Could not get user cosmetics.";
            cosmetics.set(unavailable);
            return;
        }

        const json = await userCosmeticsRes.json();
        cosmetics.set(json.data);
    }

    onMount(() => {
        getUserCosmetics();
    });
</script>

{#if $bundles === loading}
    <div class="flex-1 flex items-center justify-center text-[#806593]">
        <Loader size={32}/>
    </div>
{:else if $bundles === unavailable || error}
    You have no cosmetics.
{:else}
    <div class="flex flex-col gap-2">
        {#each [...$bundles.entries()] as [ bundleId, bundleItems ]}
            <CosmeticBundle {bundleItems}/>
        {/each}
    </div>
{/if}