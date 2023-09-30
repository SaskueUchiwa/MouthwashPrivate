<script lang="ts">
    import type { LoadedCosmeticImage, LoadedHatCosmeticImages } from "../../lib/previewTypes";
    import ItemCanvas from "./ItemCanvas.svelte";

    export let hatCosmetic: LoadedHatCosmeticImages|undefined;
    export let colorImage: LoadedCosmeticImage;

    $: console.log(hatCosmetic);
</script>

<div class="w-40 h-45 relative">
    <div class="absolute w-80 h-120 -bottom-1/2 -left-1/2">
        {#if hatCosmetic}
            {#key hatCosmetic}
                {#if hatCosmetic.asset.in_front}
                    <ItemCanvas
                        layers={[ hatCosmetic.back, colorImage, hatCosmetic.main ]} offset={{ x: 0, y: 0 }}/>
                {:else}
                    <ItemCanvas
                        layers={[ hatCosmetic.back, hatCosmetic.main, colorImage ]} offset={{ x: 0, y: 0 }}/>
                {/if}
            {/key}
        {:else}
            <ItemCanvas
                layers={[ colorImage ]} offset={{ x: 0, y: 0 }}/>
        {/if}
    </div>
</div>