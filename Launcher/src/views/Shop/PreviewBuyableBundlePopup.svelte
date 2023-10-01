<script lang="ts">
    import { createEventDispatcher } from "svelte";
    const dispatchEvent = createEventDispatcher();

    import type { LoadedHatCosmeticImages, SomeLoadedCosmeticImages } from "../../lib/previewTypes";
    import type { Bundle } from "../../stores/accounts";
    import BundlePreviewList from "../Account/Cosmetics/BundlePreviewList.svelte";
    import CharacterOutfitPreview from "../Preview/CharacterOutfitPreview.svelte";

    export let bundle: Bundle|undefined;

    let selectedItemId = "";
    let hatCosmetic: LoadedHatCosmeticImages|undefined = undefined;

    let bundlePreviewList: BundlePreviewList|undefined = undefined;

    function wearItem(cosmeticItem: SomeLoadedCosmeticImages) {
        if (cosmeticItem.asset.type === "HAT") {
            hatCosmetic = cosmeticItem;
        }
    }
</script>

<button class="fixed left-0 top-0 w-full h-full flex gap-4 items-center justify-center bg-[#000000b5] z-10 cursor-pointer" on:click={ev => dispatchEvent("close")}>
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
    <div class="bg-[#1a0428] rounded-xl shadow-lg min-h-1/2 px-6 p-4 flex cursor-default" on:click={ev => ev.stopPropagation()}>
        <div class="flex flex-col items-start flex-1 gap-2">
            <span class="text-xl">Preview Character</span>
            <p class="text-[#806593] italic text-sm text-left">
                Cosmetics in the {bundle.name} bundle are on the right,<br>
                you can click them to see how they'd look on your<br>character before you buy.
            </p>
            <div class="flex flex-1 w-full">
                <div class="flex-1 w-full h-full flex justify-center items-center px-8">
                    <CharacterOutfitPreview colorName={"Rose"} {hatCosmetic}/>
                </div>
            </div>
        </div>
    </div>
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
    <div class="bg-[#1a0428] rounded-xl shadow-lg min-h-1/2 min-w-1/3 px-6 p-4 flex cursor-default" on:click={ev => ev.stopPropagation()}>
        <div class="flex flex-col items-start flex-1 gap-4">
            <span class="text-xl">Preview Bundle</span>
            <div class="flex flex-1 w-full">
                <div class="flex-[3_0_0] flex flex-col gap-4 min-h-0">
                    <BundlePreviewList
                        bundle={{ ...bundle, owned_at: null }}
                        isOfficial={false}
                        bind:selectedItemId
                        on:wear-item={ev => wearItem(ev.detail)}
                        bind:this={bundlePreviewList}
                        on:cosmetics-ready={() => bundlePreviewList?.selectItem(0)}/>
                </div>
            </div>
        </div>
    </div>
</button>