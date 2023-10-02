<script lang="ts">
    import * as amongus from "@skeldjs/constant";
    import { createEventDispatcher } from "svelte";
    const dispatchEvent = createEventDispatcher();

    import * as unzipit from "unzipit";
    import * as b64ab from "base64-arraybuffer";
    import * as path from "@tauri-apps/api/path";
    import * as fs from "@tauri-apps/api/fs";
    import jsShaHashes from "js-sha256";
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
        // const existingDataBase64 = localStorage.getItem("cache:" + bundleInfo.id);
        // if (existingDataBase64 !== null) {
        //     const existingData = b64ab.decode(existingDataBase64);
        //     const existingHash = jsShaHashes.sha256(existingData).toUpperCase();
        //     if (existingHash === bundleInfo.preview_contents_hash) {
        //         return existingData;
        //     }
        // }

        const bundlesPath = await path.join(await path.appDataDir(), "Cache");
        await fs.createDir(bundlesPath, { recursive: true });
        const cachedPath = await path.join(bundlesPath, bundleInfo.id);
        if (!isOfficial && await fs.exists(cachedPath)) {
            const a = Date.now();
            const fileData = await fs.readBinaryFile(cachedPath);
            console.log("Took %sms to load file", Date.now() - a);
            const existingHash = jsShaHashes.sha256(fileData).toUpperCase();
            if (existingHash === bundleInfo.preview_contents_hash) {
                return fileData.buffer;
            }
        }

        const d = Date.now();
        const res = await fetch(bundleInfo.preview_contents_url);
        if (!res.ok) return undefined;

        const buffer = await res.arrayBuffer();
        console.log("Took %sms to fetch file", Date.now() - d);
        // localStorage.setItem("cache:" + bundleInfo.id, b64ab.encode(buffer));
        if (!isOfficial) await fs.writeBinaryFile(cachedPath, buffer);
        
        return buffer;
    }

    async function loadCosmeticSpriteAsImage(entries: Record<string, unzipit.ZipEntry>, assetId: number, material: "default"|"player", spriteFileReference: SpriteFileReference|undefined|null): Promise<LoadedCosmeticImage|undefined> {
        if (spriteFileReference === undefined || spriteFileReference === null) return undefined;

        const spriteFileData = await entries[`${assetId}/${spriteFileReference.file}`].arrayBuffer();
        const spriteFileBase64 = b64ab.encode(spriteFileData);

        const img = new Image;
        img.src = "data:image/png;base64," + spriteFileBase64;
        return { img, material, pivot: spriteFileReference.pivot, scale: isOfficial ? 1 : 0.5 };
    }

    let loadedCosmeticImages: LoadedHatCosmeticImages[] = [];
    let loadingCosmetics = true;
    let hasMore = false;
    onMount(async () => {
        const buf = await fetchZip();
        const { entries } = await unzipit.unzip(buf);
        const metadataFileText = await entries["metadata.json"].text();
        const metadata = JSON.parse(metadataFileText) as AssetsListingMetadata;

        let i = 0;
        for (; i < (showMax !== null ? Math.min(showMax, metadata.assets.length) : metadata.assets.length); i++) {
            const asset = metadata.assets[i];
            if (asset.type === "HAT") {
                const material = asset.player_material ? "player" : "default";
                loadedCosmeticImages.push({
                    asset,
                    main: await loadCosmeticSpriteAsImage(entries, i, material, asset.main),
                    back: await loadCosmeticSpriteAsImage(entries, i, material, asset.back),
                    left_main: await loadCosmeticSpriteAsImage(entries, i, material, asset.left_main),
                    left_back: await loadCosmeticSpriteAsImage(entries, i, material, asset.left_back),
                    climb: await loadCosmeticSpriteAsImage(entries, i, material, asset.climb),
                    floor: await loadCosmeticSpriteAsImage(entries, i, material, asset.floor),
                    left_climb: await loadCosmeticSpriteAsImage(entries, i, material, asset.left_climb),
                    left_floor: await loadCosmeticSpriteAsImage(entries, i, material, asset.left_floor),
                    thumb: await loadCosmeticSpriteAsImage(entries, i, material, asset.thumb)
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