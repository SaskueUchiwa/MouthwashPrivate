<script lang="ts">
    import * as path from "@tauri-apps/api/path";
    import JSZip from "jszip";
    import type { Bundle } from "../../stores/accounts";
    import { onMount } from "svelte";
    import type { AssetsListingMetadata, LoadedHatCosmeticImages, SpriteFileReference } from "../../lib/previewTypes";
    import PreviewItemThumb from "./PreviewItemThumb.svelte";

    export let bundleInfo: Bundle & { preview_contents_url: string; };
    export let selectedItemId: string;

    async function fetchZip() {
        const res = await fetch(bundleInfo.preview_contents_url);
        if (!res.ok) return undefined;

        return await res.arrayBuffer();
    }

    // https://stackoverflow.com/a/9458996
    function arrayBufferToBase64(arrayBuffer: ArrayBuffer) {
        var binary = '';
        var bytes = new Uint8Array(arrayBuffer);
        var len = bytes.byteLength;
        for (var i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    async function loadCosmeticSpriteAsImage(zip: JSZip, assetId: number, spriteFileReference: SpriteFileReference|undefined|null) {
        if (spriteFileReference === undefined || spriteFileReference === null) return undefined;

        const spriteZipPath = (await path.join(assetId.toString(), spriteFileReference.file)).replace(/\\/g, "/");
        const spriteFile = zip.file(spriteZipPath);
        if (spriteFile === null) {
            console.log("Could not get file in archive: %s", spriteZipPath);
            return undefined;
        }
        const spriteFileData = await spriteFile.async("arraybuffer");
        const spriteFileBase64 = arrayBufferToBase64(spriteFileData);

        const img = new Image;
        img.src = "data:image/png;base64," + spriteFileBase64;
        return { img, pivot: spriteFileReference.pivot };
    }

    let loadedCosmeticImages: LoadedHatCosmeticImages[] = [];
    onMount(async () => {
        const zip = new JSZip();
        await zip.loadAsync(await fetchZip());

        const metadataFile = zip.file("metadata.json");
        const metadataFileText = await metadataFile.async("text");
        const metadata = JSON.parse(metadataFileText) as AssetsListingMetadata;

        for (let i = 0; i < metadata.assets.length; i++) {
            const asset = metadata.assets[i];
            if (asset.type === "HAT") {
                loadedCosmeticImages.push({
                    asset,
                    main: await loadCosmeticSpriteAsImage(zip, i, asset.main),
                    back: await loadCosmeticSpriteAsImage(zip, i, asset.back),
                    left_main: await loadCosmeticSpriteAsImage(zip, i, asset.left_main),
                    left_back: await loadCosmeticSpriteAsImage(zip, i, asset.left_back),
                    climb: await loadCosmeticSpriteAsImage(zip, i, asset.climb),
                    floor: await loadCosmeticSpriteAsImage(zip, i, asset.floor),
                    left_climb: await loadCosmeticSpriteAsImage(zip, i, asset.left_climb),
                    left_floor: await loadCosmeticSpriteAsImage(zip, i, asset.left_floor),
                    thumb: await loadCosmeticSpriteAsImage(zip, i, asset.thumb)
                });
            }
        }
        loadedCosmeticImages = loadedCosmeticImages;
    });
</script>

<div class="grid gap-2 grid-cols-7 grid-rows-auto">
    {#each loadedCosmeticImages as cosmeticImage}
        <PreviewItemThumb {cosmeticImage} bind:selectedItemId on:wear-item/>
    {/each}
</div>