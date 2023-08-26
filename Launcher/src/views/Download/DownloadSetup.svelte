<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import Adjustments from "../../icons/Adjustments.svelte";
    import DropDown from "../../components/DropDown.svelte";
    import SteamDownloadSetup from "./SteamDownloadSetup.svelte";
    import SteamAuth from "./SteamAuth.svelte";
    import EpicGamesDownloadSetup from "./EpicGamesDownloadSetup.svelte";

    export let steamAuthModal: SteamAuth;
    export let isVisible = false;

    const dispatchEvent = createEventDispatcher();

    const platforms = [ "Steam", "Epic Games", "Itch/Local Installation" ];
    let selectedPlatformIdx = -1;

    let steamDownloadSetup: SteamDownloadSetup|undefined = undefined;
    let epicGamesDownloadSetup: EpicGamesDownloadSetup|undefined = undefined;

    export function show() {
        isVisible = true;
    }

    export function hide() {
        isVisible = false;
        dispatchEvent("close");
    }

    async function validateAndGetInstaller() {
        if (selectedPlatformIdx === 0) {
            if (!steamDownloadSetup)
                return undefined;

            if (!await steamDownloadSetup.validate())
                return undefined;

            return steamDownloadSetup.getInstaller();
        } else if (selectedPlatformIdx === 1) {
            return epicGamesDownloadSetup.getInstaller();
        }

        return undefined;
    }

    async function submit() {
        const installer = await validateAndGetInstaller();
        if (installer === undefined) {
            return;
        }
        hide();
        dispatchEvent("finalise-download", { installer });
    }
</script>

<div class="left-0 top-0 w-full h-full items-center justify-center bg-[#000000b5]" class:flex={isVisible} class:hidden={!isVisible} class:fixed={isVisible}>
    <div class="bg-[#1a0428] w-1/4 h-1/2 rounded-xl shadow-lg px-6 p-4">
        <div class="flex flex-col h-full gap-2">
            <div class="flex items-center gap-2">
                <Adjustments size={20}/>
                <span class="text-lg">Download Setup</span>
            </div>
            <p class="text-[#806593] italic text-xs">
                To download PGG: Rewritten, the launcher will use the Steam or Epic Games servers to download
                an older version of Among Us (2021.6.30s).
            </p>
            <span class="text-md">Where do you own Among Us?</span>
            <DropDown items={platforms} bind:selectedIdx={selectedPlatformIdx}/>
            {#if selectedPlatformIdx === 0}
                <SteamDownloadSetup {steamAuthModal} bind:this={steamDownloadSetup}/>
            {:else if selectedPlatformIdx === 1}
                <EpicGamesDownloadSetup bind:this={epicGamesDownloadSetup}/>
            {:else if selectedPlatformIdx === 2}
                <p class="text-[#806593] italic text-xs">
                    Local game installations are not currently supported, check back later!
                </p>
            {:else}
                <p class="text-[#806593] italic text-xs">
                    Select which platform you have purchased Among Us.
                </p>
            {/if}
            <div class="mt-auto self-end flex gap-2">
                <button class="rounded-lg border-2 bg-transparent border-[#27063e] px-4 py-1 hover:text-[#bba1ce] filter border-none font-inherit text-inherit cursor-pointer" on:click={hide}>
                    Cancel
                </button>
                <button class="rounded-lg bg-[#27063e] px-4 py-1 hover:bg-[#1C072B] hover:text-[#bba1ce] filter border-none font-inherit text-inherit cursor-pointer"
                    class:grayscale={selectedPlatformIdx === -1}
                    class:pointer-events-none={selectedPlatformIdx === -1}
                    on:click={submit}
                >
                    Begin Download
                </button>
            </div>
        </div>
    </div>
</div>