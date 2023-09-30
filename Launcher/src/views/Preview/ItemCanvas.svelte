<script lang="ts">
    import { onMount } from "svelte";
    import type { LoadedCosmeticImage } from "../../lib/previewTypes";

    export let layers: (LoadedCosmeticImage|undefined)[];
    export let offset: { x: number; y: number; };

    let canvasElement: HTMLCanvasElement|undefined = undefined;
    $: canvasCtx = canvasElement?.getContext("2d");

    for (const layer of layers) {
        if (layer) {
            layer.img.onload = doRedraw;
        }
    }

    function doRedraw() {
        if (canvasElement === undefined || canvasCtx === undefined)
            return;

        const canvasBounds = canvasElement.getBoundingClientRect();
        canvasElement.width = canvasBounds.width;
        canvasElement.height = canvasBounds.height;

        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

        for (const layer of layers) {
            if (layer) {
                const aspectRatio = layer.img.width / layer.img.height;
                canvasCtx.drawImage(layer.img, layer.pivot.x, offset.y + layer.pivot.y, canvasElement.width, canvasElement.width / aspectRatio);
            }
        }
    }

    $: canvasCtx, doRedraw();

    onMount(() => {
        doRedraw();
    });
</script>

<canvas width={0} height={0} class="w-full h-full" bind:this={canvasElement}></canvas>