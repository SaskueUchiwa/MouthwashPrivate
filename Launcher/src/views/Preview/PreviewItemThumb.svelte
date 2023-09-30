<script lang="ts">
    import { createEventDispatcher } from "svelte";
    const dispatchEvent = createEventDispatcher();

    import type { LoadedHatCosmeticImages } from "../../lib/previewTypes";
    import ItemCanvas from "./ItemCanvas.svelte";

    export let cosmeticImage: LoadedHatCosmeticImages;
    export let selectedItemId: string;

    function wearItem() {
        dispatchEvent("wear-item", cosmeticImage);
        selectedItemId = cosmeticImage.asset.product_id;
    }
</script>

<button
    class="border-2 rounded-lg group overflow-hidden"
    class:border-[#521180]={selectedItemId !== cosmeticImage.asset.product_id}
    class:bg-[#160124]={selectedItemId !== cosmeticImage.asset.product_id}
    class:border-[#eed7ff]={selectedItemId === cosmeticImage.asset.product_id}
    class:bg-[#24033b]={selectedItemId === cosmeticImage.asset.product_id}
    style="aspect-ratio: 1/1"
    on:click={wearItem}>
    <div class="transition duration-250 transform group-hover:scale-115 w-full h-full">
        <ItemCanvas layers={[ cosmeticImage.thumb ]} offset={{ x: 0, y: -20 }}/>
    </div>
</button>