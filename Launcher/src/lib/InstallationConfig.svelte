<script lang="ts">
    import { open as openFolderOrUrl } from "@tauri-apps/api/shell";
    import { createEventDispatcher } from "svelte";
    import OpenFolder from "../icons/OpenFolder.svelte";
    import Desktop from "../icons/Desktop.svelte";
    import Delete from "../icons/Delete.svelte";
    const dispatchEvent = createEventDispatcher();

    export let installLocation: string;
    export let isGameOpen: boolean;
    export let localInstalledModVersion: string;

    let isOpen = false;
    export function open() {
        isOpen = true;
    }

    export function close() {
        isOpen = false;
    }

    async function openFolder() {
        await openFolderOrUrl(installLocation);
    }
</script>

<div
    class:hidden={!isOpen}
    class:fixed={isOpen}
    class="left-0 top-0 w-full h-full bg-black/50 flex items-center justify-center cursor-pointer"
    on:click={close}
    on:keypress={ev => ev.key === "Enter" && close()}
    role="none"
>
    <div class="w-128 bg-[#1b0729] px-4 py-3 rounded-lg flex flex-col items-start gap-2 cursor-default text-white" on:click={ev => ev.stopPropagation()} on:keypress={ev => ev.stopPropagation()} role="none">
        <p class="text-[#8f75a1] text-sm max-w-102">Mod version: {localInstalledModVersion}</p>
        <span class="text-2xl">Install Location</span>
        <div class="flex flex-col gap-2">
            <p class="text-[#8f75a1] text-sm max-w-102">
                This is where Mouthwash was installed to when you first downloaded it. If you want to change the location, you can just
                move the files yourself with file explorer and tell Mouthwash where the new location of the files are.
            </p>
            <div class="flex flex-col gap-2">
                <div class="bg-[#2e1440] rounded-lg flex"
                >
                    <div class="text-[#8f75a1] p-2">
                        <OpenFolder size={20}/>
                    </div>
                    <input
                        class="bg-transparent px-4 py-1 w-72 flex-1"
                        placeholder="File Location"
                        readonly
                        value={installLocation}
                    >
                </div>
            </div>
            <button
                class="self-start px-2 py-1 bg-[#2e1440] text-[#8f75a1] hover:text-[#d0bfdb] transition-colors rounded-lg flex items-center justify-center gap-1"
                on:click={openFolder}
            >
                <Desktop size={14}/><span>Open in Explorer</span>
            </button>
        </div>
        <span class="text-2xl mt-4">Uninstall Mouthwash</span>
        <div class="flex flex-col gap-2">
            <p class="text-[#8f75a1] text-sm max-w-102">
                Click the button below to uninstall Mouthwash. This won't uninstall the launcher, so you'll be able to
                download Mouthwash again afterwards.
            </p>
            <button
                class="self-start px-2 py-1 bg-[#2e1440] text-[#8f75a1] hover:text-[#d0bfdb] transition-colors rounded-lg flex items-center justify-center gap-1 filter"
                class:pointer-events-none={isGameOpen}
                class:grayscale={isGameOpen}
                disabled={isGameOpen}
                on:click={() => dispatchEvent("uninstall")}
            >
                <Delete size={14}/><span>Uninstall</span>
            </button>
            {#if isGameOpen}
                <p class="text-sm text-yellow-400 max-w-102 italic">
                    The game is currently running, close it to be able to uninstall it.
                </p>
            {/if}
        </div>
    </div>
</div>