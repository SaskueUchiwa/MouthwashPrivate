<script lang="ts">
    import { writable } from "svelte/store";
    import { type BundleItem, loading, unavailable, accountUrl, user } from "../../stores/accounts";
    import { onMount } from "svelte";
    import Loader from "../../icons/Loader.svelte";
    import BuyableCosmeticBundle from "./BuyableCosmeticBundle.svelte";
    import Search from "../../icons/Search.svelte";
    import ValuationDropdown from "./ValuationDropdown.svelte";

    let error = "";
    let ownedCosmetics = writable<BundleItem[]|typeof loading|typeof unavailable>(loading);

    let availableCosmetics = writable<BundleItem[]|typeof loading|typeof unavailable>(loading);
    let availableBundles = writable<Map<string, BundleItem[]>|typeof loading|typeof unavailable>(loading);

    const valuations = [ "GHOST", "CREWMATE", "IMPOSTOR", "POLUS" ];
    let selectedValuationIdxs = [];

    let searchTerm = "";

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
        const userCosmeticsRes = await fetch($accountUrl + "/api/v2/bundles?"
            + (searchTerm.length > 0 ? "text_search=" + searchTerm : "")
            + (selectedValuationIdxs.length > 0 ? "&valuations=" + selectedValuationIdxs.map(i => valuations[i]).join(",") : ""));

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
        <div class="flex items-center border-b-1 pb-2 mb-1 border-white/20 gap-2">
            {#if $availableBundles !== unavailable && $availableBundles !== loading}
                <span class="text-xs">Showing {$availableBundles.size} bundle{$availableBundles.size === 1 ? "" : "s"}</span>
            {/if}
            <div class="ml-auto order-2">
                <div class="flex gap-1">
                    <ValuationDropdown bind:selectedIdxs={selectedValuationIdxs} items={["Ghost", "Crewmate", "Impostor", "Polus"]} small={true}/>
                    <div class="flex border-transparent rounded-lg">
                        <div class="p-2 bg-[#27063e] rounded-l-lg"><Search size={14}/></div>
                        <input
                            class="border-none font-inherit text-inherit text-xs outline-none rounded-r-lg bg-[#27063e] w-64"
                            placeholder="Search"
                            on:keypress={ev => ev.key === "Enter" && getAvailableCosmetics()}
                            bind:value={searchTerm}>
                    </div>
                    <button class="text-xs rounded-lg bg-[#27063e] px-4 py-1 hover:bg-[#1C072B] hover:text-[#bba1ce] filter border-none font-inherit cursor-pointer"
                        class:grayscale={$availableBundles === loading}
                        class:pointer-events-none={$availableBundles === loading}
                        on:click={getAvailableCosmetics}
                    >
                        Go
                    </button>
                </div>
            </div>
        </div>
        {#if $availableBundles === loading}
            <div class="flex-1 flex items-center justify-center text-[#806593]">
                <Loader size={32}/>
            </div>
        {:else if $availableBundles === unavailable || error}
            Cosmetics are not available right now, check back later or contact support.
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