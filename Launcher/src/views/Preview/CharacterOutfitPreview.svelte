<script lang="ts">
    import * as amongus from "@skeldjs/constant";
    import type { LoadedCosmeticImage, LoadedHatCosmeticImages } from "../../lib/previewTypes";
    import ItemCanvas from "./ItemCanvas.svelte";

    export let hatCosmetic: LoadedHatCosmeticImages|undefined;
    export let playerColor: amongus.Color;

    const colorImage = new Image;
    colorImage.src = `/Template_Color.png`;

    $: loadedColorImage = colorImage ? { img: colorImage, material: "player", pivot: { x: 0, y: 0 }, scale: 1 } as LoadedCosmeticImage : undefined;
</script>

<div class="w-40 h-45 relative">
    <div class="absolute w-80 h-120 -bottom-3/5 -left-1/2">
        {#if hatCosmetic}
            {#key hatCosmetic}
                {#if hatCosmetic.asset.in_front}
                    <ItemCanvas
                        layers={[ hatCosmetic.back, loadedColorImage, hatCosmetic.main ]} {playerColor} offset={{ x: 0, y: 0 }}/>
                {:else}
                    <ItemCanvas
                        layers={[ hatCosmetic.back, hatCosmetic.main, loadedColorImage ]} {playerColor} offset={{ x: 0, y: 0 }}/>
                {/if}
            {/key}
        {:else}
            <ItemCanvas
                layers={[ loadedColorImage ]} {playerColor} offset={{ x: 0, y: 0 }}/>
        {/if}
    </div>
</div>