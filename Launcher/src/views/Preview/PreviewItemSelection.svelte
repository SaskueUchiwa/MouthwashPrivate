<script lang="ts">
    import * as amongus from "@skeldjs/constant";
    import { createEventDispatcher } from "svelte";
    const dispatchEvent = createEventDispatcher();

    import * as path from "@tauri-apps/api/path";
    import JSZip from "jszip";
    import type { Bundle } from "../../stores/accounts";
    import { onMount } from "svelte";
    import type { AssetsListingMetadata, LoadedCosmeticImage, LoadedHatCosmeticImages, SpriteFileReference } from "../../lib/previewTypes";
    import PreviewItemThumb from "./PreviewItemThumb.svelte";
    import Loader from "../../icons/Loader.svelte";
    import Plus from "../../icons/Plus.svelte";

    export let bundleInfo: Bundle & { preview_contents_url: string; };
    export let selectedItemId: string|null;
    export let isOfficial: boolean;
    export let searchTerm: string;
    export let thumbScale: number;
    export let showMax: number|null = null;
    export let itemSize = 76;
    export let playerColor: amongus.Color;
    
    export function selectItem(idx: number) {
        if (idx >= loadedCosmeticImages.length)
            return;
        
        selectedItemId = loadedCosmeticImages[idx].asset.product_id;
        dispatchEvent("wear-item", loadedCosmeticImages[idx]);
    }

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

    async function loadCosmeticSpriteAsImage(zip: JSZip, assetId: number, material: "default"|"player", spriteFileReference: SpriteFileReference|undefined|null): Promise<LoadedCosmeticImage|undefined> {
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
        return { img, material, pivot: spriteFileReference.pivot, scale: isOfficial ? 1 : 0.5 };
    }

    let loadedCosmeticImages: LoadedHatCosmeticImages[] = [];
    let loadingCosmetics = true;
    let hasMore = false;
    onMount(async () => {
        const zip = new JSZip();
        await zip.loadAsync(await fetchZip());

        const metadataFile = zip.file("metadata.json");
        const metadataFileText = await metadataFile.async("text");
        const metadata = JSON.parse(metadataFileText) as AssetsListingMetadata;

        let i = 0;
        for (; i < (showMax !== null ? Math.min(showMax, metadata.assets.length) : metadata.assets.length); i++) {
            const asset = metadata.assets[i];
            if (asset.type === "HAT") {
                const material = asset.player_material ? "player" : "default";
                loadedCosmeticImages.push({
                    asset,
                    main: await loadCosmeticSpriteAsImage(zip, i, material, asset.main),
                    back: await loadCosmeticSpriteAsImage(zip, i, material, asset.back),
                    left_main: await loadCosmeticSpriteAsImage(zip, i, material, asset.left_main),
                    left_back: await loadCosmeticSpriteAsImage(zip, i, material, asset.left_back),
                    climb: await loadCosmeticSpriteAsImage(zip, i, material, asset.climb),
                    floor: await loadCosmeticSpriteAsImage(zip, i, material, asset.floor),
                    left_climb: await loadCosmeticSpriteAsImage(zip, i, material, asset.left_climb),
                    left_floor: await loadCosmeticSpriteAsImage(zip, i, material, asset.left_floor),
                    thumb: await loadCosmeticSpriteAsImage(zip, i, material, asset.thumb)
                });
            }
        }
        hasMore = i != metadata.assets.length;
        loadedCosmeticImages = loadedCosmeticImages;
        loadingCosmetics = false;
        dispatchEvent("cosmetics-ready");
    });
</script>

{#if loadingCosmetics}
    <div class="w-full h-full">
        <Loader size={32}/>
    </div>
{:else}
    <div class="flex gap-2 flex-wrap items-center">
        {#each loadedCosmeticImages as cosmeticImage}
            <PreviewItemThumb {cosmeticImage} {searchTerm} {thumbScale} size={itemSize} {playerColor} bind:selectedItemId on:wear-item/>
        {/each}
        {#if hasMore}
            <div style="width: {itemSize}px; height: {itemSize}px;" class="flex items-center justify-center text-[#160124] border-2 border-[#160124] rounded-lg">
                <Plus size={24}/>
            </div>
        {/if}
    </div>
{/if}