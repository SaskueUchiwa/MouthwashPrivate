<script lang="ts">
    import { createEventDispatcher } from "svelte";
    const dispatchEvent = createEventDispatcher();

    import type { LoadedHatCosmeticImages } from "../../lib/previewTypes";
    import ItemCanvas from "./ItemCanvas.svelte";

    export let cosmeticImage: LoadedHatCosmeticImages;
    export let searchTerm: string;
    export let selectedItemId: string|null;
    export let thumbScale: number;
    export let size = 76;

    function wearItem() {
        if (selectedItemId === null)
            return;
        dispatchEvent("wear-item", cosmeticImage);
        selectedItemId = cosmeticImage.asset.product_id;
    }
</script>

<button
    class="border-2 rounded-lg group overflow-hidden"
    class:pointer-events-none={selectedItemId === null}
    class:hidden={searchTerm !== "" && !cosmeticImage.asset.product_id.replace(/\W/g, "").toLowerCase().includes(searchTerm.replace(/\W/g, "").toLowerCase())}
    class:border-[#521180]={selectedItemId === null || selectedItemId !== cosmeticImage.asset.product_id}
    class:bg-[#160124]={selectedItemId === null || selectedItemId !== cosmeticImage.asset.product_id}
    class:border-[#eed7ff]={selectedItemId !== null && selectedItemId === cosmeticImage.asset.product_id}
    class:bg-[#24033b]={selectedItemId !== null && selectedItemId === cosmeticImage.asset.product_id}
    style="aspect-ratio: 1/1; width: {size}px; height: {size}px;"
    on:click={wearItem}
    title={cosmeticImage.asset.product_id}>
    <div class="transition duration-250 transform group-hover:scale-115 w-full h-full">
        <ItemCanvas layers={[ { ...cosmeticImage.thumb, scale: thumbScale } ]} offset={{ x: cosmeticImage.asset.chip_offset.x * 100, y: 15 - cosmeticImage.asset.chip_offset.y * 100 }}/>
    </div>
</button>