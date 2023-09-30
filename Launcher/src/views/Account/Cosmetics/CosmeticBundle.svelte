<script lang="ts">
    import { createEventDispatcher } from "svelte";
    const dispatchEvent = createEventDispatcher();

    import ArrowRight from "../../../icons/ArrowRight.svelte";
    import type { Bundle } from "../../../stores/accounts";
    import FeaturedBundleThumbnail from "../../Shop/FeaturedBundleThumbnail.svelte";

    export let bundleInfo: Bundle;
</script>

<button class="flex items-center gap-3 bg-[#0c0213] rounded-lg" on:click={() => dispatchEvent("select-bundle")}>
    <FeaturedBundleThumbnail ownedItems={[]} {bundleInfo} size={84} showDetails={false}/>
    <div class="flex flex-col items-start">
        <span class="text-xl">{bundleInfo.name} Bundle</span>
        <span class="text-[#806593] italic text-sm">
            {bundleInfo.num_items} item{bundleInfo.num_items === 1 ? "" : "s"}
        </span>
    </div>
    <div class="ml-auto mx-4">
        <ArrowRight size={24}/>
    </div>
</button>