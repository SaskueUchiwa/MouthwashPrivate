<script lang="ts">
    import CheckBadge from "../../icons/CheckBadge.svelte";
    import type { BundleItem } from "../../stores/accounts";

    export let bundleItems: BundleItem[];
    export let ownedItems: BundleItem[]|undefined;
    export let size: number;
    export let showDetails: boolean;

    $: bundleInfo = bundleItems[0];
    $: doesAlreadyOwn = ownedItems && bundleItems.every(item => ownedItems.find(x => x.id === item.id));
</script>

<button class="relative filter hover:contrast-110 transition duration-500 rounded-md overflow-hidden" on:click>
    <div class="filter" class:grayscale={doesAlreadyOwn}>
        <img src={bundleInfo.thumbnail_url} width={size} height={size} alt={bundleInfo.bundle_name}/>
    </div>
    {#if showDetails}
        {#if doesAlreadyOwn}
            <div class="absolute left-0 bottom-0 w-full h-8 flex items-center justify-center bg-emerald-600/90 text-white">
                <div class="flex gap-1">
                    <CheckBadge size={16}/>
                    <span class="text-sm">Purchased</span>
                </div>
            </div>
        {:else}
            <div class="absolute left-0 bottom-0 w-full h-8 flex items-center justify-center bg-black/60 text-white">
                <div class="flex gap-1">
                    <span class="text-sm px-1">{bundleInfo.bundle_name} ({bundleItems.length} item{bundleItems.length === 1 ? "" : "s"})</span>
                </div>
            </div>
        {/if}
    {/if}
</button>