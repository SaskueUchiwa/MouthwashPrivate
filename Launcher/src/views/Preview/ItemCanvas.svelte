<script lang="ts">
    import { onMount } from "svelte";
    import type { LoadedCosmeticImage } from "../../lib/previewTypes";

    export let layers: (LoadedCosmeticImage|undefined)[];
    export let offset: { x: number; y: number; };

    let canvasElement: HTMLCanvasElement|undefined = undefined;
    $: canvasCtx = canvasElement?.getContext("2d");

    for (const layer of layers) {
        if (layer && layer.img) {
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
            if (layer && layer.img) {
                const aspectRatio = layer.img.width / layer.img.height;
                const actualWidth = canvasElement.width * layer.scale;
                const actualHeight = actualWidth / aspectRatio;
                const centreX = canvasElement.width / 2;
                const centreY = canvasElement.height / 2;
                canvasCtx.drawImage(layer.img, centreX - actualWidth / 2 + offset.x, centreY - actualHeight / 2 + offset.y, actualWidth, actualHeight);
            }
        }
    }

    $: canvasCtx, doRedraw();

    onMount(() => {
        doRedraw();
    });
</script>

<canvas width={0} height={0} class="w-full h-full" bind:this={canvasElement}></canvas>