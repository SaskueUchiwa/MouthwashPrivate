<script lang="ts">
    import type { LoadedHatCosmeticImages } from "../../lib/previewTypes";
    import ItemCanvas from "./ItemCanvas.svelte";

    export let hatCosmetic: LoadedHatCosmeticImages|undefined;
    export let colorImage: HTMLImageElement;
</script>

<div class="w-40 h-45 relative">
    <div class="absolute w-40 h-60 bottom-0">
        {#if hatCosmetic}
            {#key hatCosmetic}
                <ItemCanvas
                    layers={[ hatCosmetic.back, { img: colorImage, pivot: { x: 0, y: 0 } }, hatCosmetic.main ]} offset={{ x: 0, y: 0 }}/>
            {/key}
        {:else}
            <ItemCanvas
                layers={[ { img: colorImage, pivot: { x: 0, y: 0 } } ]} offset={{ x: 0, y: 0 }}/>
        {/if}
    </div>
</div>