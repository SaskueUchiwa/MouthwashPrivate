<script lang="ts">
    import FeaturedBundleThumbnail from "../../Shop/FeaturedBundleThumbnail.svelte";
    import PreviewItemSelection from "../../Preview/PreviewItemSelection.svelte";
    import type { Bundle } from "../../../stores/accounts";
    import Search from "../../../icons/Search.svelte";

    export let isOfficial: boolean;
    export let bundle: Bundle & { owned_at: string; };
    export let selectedItemId: string;

    let previewItemSelection: PreviewItemSelection|undefined;
    export function selectItem(idx: number) {
        previewItemSelection?.selectItem(idx);
    }

    let bundleSearchTerm = "";
    
    const boughtAtFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
</script>

<div class="flex items-center border-b-1 pb-2 mb-1 border-white/20 gap-2">
    <div class="flex items-center gap-3">
        <FeaturedBundleThumbnail ownedItems={[]} bundleInfo={bundle} size={84} showDetails={false}/>
        <div class="flex flex-col items-start">
            <span class="text-xl">{bundle.name} Bundle</span>
            <span class="text-[#806593] italic text-sm">
                {#if bundle.owned_at === null}
                    {bundle.num_items} item{bundle.num_items === 1 ? "" : "s"}
                {:else}
                    Bought on {boughtAtFormat.format(new Date(bundle.owned_at))}, {bundle.num_items} item{bundle.num_items === 1 ? "" : "s"}
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
        bundleInfo={bundle}
        searchTerm={bundleSearchTerm}
        isOfficial={isOfficial}
        thumbScale={isOfficial ? 3 : 1}
        bind:selectedItemId
        on:wear-item
        on:cosmetics-ready
        bind:this={previewItemSelection}/>
</div>