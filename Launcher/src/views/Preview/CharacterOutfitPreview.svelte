<script lang="ts">
    import type { LoadedHatCosmeticImages } from "../../lib/previewTypes";
    import ItemCanvas from "./ItemCanvas.svelte";

    export let hatCosmetic: LoadedHatCosmeticImages|undefined;
    export let colorName: string;

    let colorImage: HTMLImageElement|undefined = undefined;
    $: if (colorName) {
        colorImage = new Image;
        colorImage.src = `/Color_${colorName}.png`;
    }

    $: loadedColorImage = colorImage ? { img: colorImage, pivot: { x: 0, y: 0 }, scale: 1 } : undefined;
</script>

<div class="w-40 h-45 relative">
    <div class="absolute w-80 h-120 -bottom-1/2 -left-1/2">
        {#if hatCosmetic}
            {#key hatCosmetic}
                {#if hatCosmetic.asset.in_front}
                    <ItemCanvas
                        layers={[ hatCosmetic.back, loadedColorImage, hatCosmetic.main ]} offset={{ x: 0, y: 0 }}/>
                {:else}
                    <ItemCanvas
                        layers={[ hatCosmetic.back, hatCosmetic.main, loadedColorImage ]} offset={{ x: 0, y: 0 }}/>
                {/if}
            {/key}
        {:else}
            <ItemCanvas
                layers={[ loadedColorImage ]} offset={{ x: 0, y: 0 }}/>
        {/if}
    </div>
</div>