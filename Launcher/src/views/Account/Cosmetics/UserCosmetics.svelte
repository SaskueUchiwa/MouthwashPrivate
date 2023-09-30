<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    const dispatchEvent = createEventDispatcher();

    import Loader from "../../../icons/Loader.svelte";
    import { type UserLogin, accountUrl, loading, unavailable, type Bundle } from "../../../stores/accounts";
    import { writable } from "svelte/store";
    import CosmeticBundle from "./CosmeticBundle.svelte";
    import PreviewItemSelection from "../../Preview/PreviewItemSelection.svelte";
    import Search from "../../../icons/Search.svelte";
    import FeaturedBundleThumbnail from "../../Shop/FeaturedBundleThumbnail.svelte";
    import ArrowRight from "../../../icons/ArrowRight.svelte";

    export let user: UserLogin;

    let error = "";
    let bundles = writable<(Bundle & { owned_at: string; })[]|typeof loading|typeof unavailable>(loading);

    let selectedItemId = "";
    let selectedBundle: (Bundle & { owned_at: string; })|undefined = undefined;
    let bundleSearchTerm = "";

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

    function selectBundle(bundle: Bundle & { owned_at: string; }) {
        selectedBundle = bundle;
        bundleSearchTerm = "";
    }

    const officialBundle: Bundle & { preview_contents_url: string; owned_at: string|null; } = {
        id: "",
        name: "Official",
        thumbnail_url: "/amongus-thumbnail.png",
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
        num_items: 61,
        owned_at: null
    };

    function goToShop() {
        dispatchEvent("switch-view", "Shop");
    }

    onMount(() => {
        getUserCosmetics();
    });
    
    const boughtAtFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
</script>

{#if $bundles === loading}
    <div class="flex-1 flex items-center justify-center text-[#806593]">
        <Loader size={32}/>
    </div>
{:else}
    {#if selectedBundle}
        <div class="flex flex-col gap-4 min-h-0">
            <div class="flex gap-2">
                <button class="text-xs rounded-lg bg-[#27063e] px-4 py-1 hover:bg-[#1C072B] hover:text-[#bba1ce] filter border-none font-inherit cursor-pointer"
                    on:click={() => selectedBundle = undefined}
                >
                    Back to Cosmetics
                </button>
            </div>
            <div class="flex items-center border-b-1 pb-2 mb-1 border-white/20 gap-2">
                <div class="flex items-center gap-3">
                    <FeaturedBundleThumbnail ownedItems={[]} bundleInfo={selectedBundle} size={84} showDetails={false}/>
                    <div class="flex flex-col items-start">
                        <span class="text-xl">{selectedBundle.name} Bundle</span>
                        <span class="text-[#806593] italic text-sm">
                            {#if selectedBundle.owned_at === null}
                                {selectedBundle.num_items} item{selectedBundle.num_items === 1 ? "" : "s"}
                            {:else}
                                Bought on {boughtAtFormat.format(new Date(selectedBundle.owned_at))}, {selectedBundle.num_items} item{selectedBundle.num_items === 1 ? "" : "s"}
                            {/if}
                        </span>
                    </div>
                </div>
                <div class="ml-auto flex border-transparent rounded-lg">
                    <div class="p-2 bg-[#27063e] rounded-l-lg"><Search size={14}/></div>
                    <input
                        class="border-none font-inherit text-inherit text-xs outline-none rounded-r-lg bg-[#27063e] w-64"
                        placeholder="Search"
                        bind:value={bundleSearchTerm}>
                </div>
            </div>
            <div class="overflow-y-auto min-h-0 px-4 flex-1">
                <PreviewItemSelection
                    bundleInfo={selectedBundle}
                    searchTerm={bundleSearchTerm}
                    isOfficial={selectedBundle === officialBundle}
                    thumbScale={selectedBundle === officialBundle ? 3 : 1}
                    bind:selectedItemId
                    on:wear-item/>
            </div>
        </div>
    {/if}
    <div class="flex flex-col gap-2 min-h-0 overflow-auto w-full" class:hidden={selectedBundle !== undefined}>
        <div class="flex flex-col gap-4">
            <CosmeticBundle bundleInfo={officialBundle} on:select-bundle={() => selectBundle(officialBundle)} on:wear-item/>
        </div>
        {#if Array.isArray($bundles)}
            {#if $bundles.length === 0}
                <div class="mt-12 self-center flex flex-col items-center justify-center gap-2">
                    <span>You don't have any bundles purchased.<br>Head to the shop to show off your style.</span>
                    <button class="rounded-lg bg-[#27063e] px-4 py-1 hover:bg-[#1C072B] hover:text-[#bba1ce] filter border-none font-inherit text-inherit text-inherit cursor-pointer flex items-center gap-2"
                        on:click={goToShop}
                    >
                        <span>View the Shop</span>
                        <ArrowRight size={16}/>
                    </button>
                </div>
            {:else}
                {#each $bundles as bundleInfo}
                    <div class="flex flex-col gap-4">
                        <CosmeticBundle {bundleInfo} on:select-bundle={() => selectBundle(bundleInfo)} on:wear-item/>
                    </div>
                {/each}
            {/if}
        {/if}
    </div>
{/if}