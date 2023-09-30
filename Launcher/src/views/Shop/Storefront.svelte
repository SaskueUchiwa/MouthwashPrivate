<script lang="ts">
    import { writable, type Writable } from "svelte/store";
    import { type Bundle, loading, unavailable, accountUrl } from "../../stores/accounts";
    import FeaturedBundleThumbnail from './FeaturedBundleThumbnail.svelte';
    import ArrowRight from '../../icons/ArrowRight.svelte';
    import Loader from "../../icons/Loader.svelte";
    import { onMount } from "svelte";

    export let ownedCosmetics: Writable<Bundle[]|typeof loading|typeof unavailable>;
    export let searchTerm: string;
    export let featureTag: string|undefined;
    export let page: string;
    export let allFeatureTags: Record<string, string>;

    let error = "";
    let featuredBundles = writable<Bundle[]|typeof loading|typeof unavailable>(loading);

    export async function getFeaturedCosmetics() {
        featuredBundles.set(loading);
        const featuredCosmeticsRes = await fetch($accountUrl + "/api/v2/bundles?feature_tag=FEATURED");

        if (!featuredCosmeticsRes.ok) {
            error = "Could not get available cosmetics.";
            featuredBundles.set(unavailable);
            return;
        }

        const json = await featuredCosmeticsRes.json();
        featuredBundles.set(json.data);
    }

    onMount(() => {
        getFeaturedCosmetics();
    });
</script>
    
<div class="flex flex-col gap-4">
    <div class="flex flex-col gap-1">
        <span class="text-2xl font-semibold">Shop Featured</span>
        <p class="max-w-196 text-sm italic">Whether new for the season, an upcoming holiday, or just popular with the community, these bundles help show off
            your style and support Polus.gg: Rewritten to keep running.</p>
        <div class="flex gap-4 py-2 px-4">
            {#if $featuredBundles === loading}
                <div class="flex-1 flex items-center justify-center text-[#806593]">
                    <Loader size={32}/>
                </div>
            {:else if $featuredBundles === unavailable}
                <span>Could not load featured bundles, try again later or contact support.</span> 
            {:else}
                {#each $featuredBundles as bundleInfo}
                    <FeaturedBundleThumbnail
                        size={164}
                        showDetails={true}
                        ownedItems={Array.isArray($ownedCosmetics) ? $ownedCosmetics : undefined}
                        {bundleInfo}
                        on:click={() => (featureTag = undefined, searchTerm = bundleInfo.name, page = "Marketplace")}/>
                {/each}
            {/if}
        </div>
    </div>
    <div class="flex flex-col items-start">
        <span class="text-2xl font-semibold">Marketplace</span>
        <p class="max-w-196 text-sm italic">Know what you're looking for or just want to browse? Here you can search all bundles that have been released, and
            view them all at a glance to find the perfect one.</p>
        <div class="flex flex-col items-start mt-2 gap-2 py-2 px-4">
            <div class="flex flex-col gap-2">
                <button
                    class="flex items-center justify-center rounded-lg px-48 py-2 bg-[#27063e] hover:bg-[#1c072b] hover:text-[#bba1ce] filter border-none font-inherit text-inherit cursor-pointer"
                    on:click={() => (featureTag = undefined, searchTerm = "", page = "Marketplace")}
                >
                    <div class="flex items-center gap-2">
                        <span>View All</span>
                        <ArrowRight size={16}/>
                    </div>
                </button>
                <div class="flex items-center justify-center w-full gap-2">
                    <div class="flex-1 bg-[#2E0F44] h-0.25"></div>
                    <span class="font-semibold text-xs text-[#2E0F44]">OR CHOOSE</span>
                    <div class="flex-1 bg-[#2E0F44] h-0.25"></div>
                </div>
            </div>
            <div class="flex flex-wrap gap-4 w-212">
                {#each Object.entries(allFeatureTags) as [ featureTagId, featureTagName ]}
                    <button
                        class="flex items-center justify-center rounded-lg px-6 py-2 bg-[#27063e] hover:bg-[#1c072b] hover:text-[#bba1ce] filter border-none font-inherit text-inherit cursor-pointer"
                        on:click={() => (featureTag = featureTagId, searchTerm = "", page = "Marketplace")}
                    >
                        <div class="flex items-center gap-2">
                            <span class="text-xs">{featureTagName}</span>
                        </div>
                    </button>
                {/each}
            </div>
        </div>
    </div>
</div>