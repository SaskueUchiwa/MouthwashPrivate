<script lang="ts">
    import { exists } from "@tauri-apps/api/fs";
    import { open as openFileDialog } from "@tauri-apps/api/dialog";
    import { createEventDispatcher, onMount } from "svelte";
    import Password from "../icons/Password.svelte";
    import DownloadSmall from "../icons/DownloadSmall.svelte";
    import UserCircle from "../icons/UserCircle.svelte";
    import Desktop from "../icons/Desktop.svelte";
    import OpenFolder from "../icons/OpenFolder.svelte";
    import { appDataDir, join, resolve } from "@tauri-apps/api/path";
    import { path } from "@tauri-apps/api";
    const dispatchEvent = createEventDispatcher();

    let isOpen = false;

    let username = "";
    let password = "";
    let enterDetailsError = false;

    let installLocation = "";
    let resolvedLocation = "";
    let invalidInstallLocation = false;

    export function open() {
        isOpen = true;
        enterDetailsError = false;
    }

    export async function getConfig() {
        await updateInstallLocationFromCache();
        await updateResolvedLocation();
        return { username, password, installLocation: await join(resolvedLocation, "Mouthwash") };
    }

    function cancelDownload() {
        isOpen = false;
        dispatchEvent("cancel-download");
    }

    async function finaliseConfig() {
        enterDetailsError = username === "" || password === "";
        await updateResolvedLocation();
        invalidInstallLocation = resolvedLocation === "" || resolvedLocation === path.sep || !await exists(resolvedLocation) ;
        if (enterDetailsError || invalidInstallLocation)
            return;

        isOpen = false;
        dispatchEvent("finalise-config");
        localStorage.setItem("install-location", resolvedLocation);
    }

    async function selectInstallationLocation() {
        const folder = await openFileDialog({
            defaultPath: await appDataDir(),
            directory: true
        });

        if (folder === null || folder === "" || Array.isArray(folder)) {
            return;
        }

        installLocation = folder;
    }

    async function updateResolvedLocation() {
        const resolved = await path.normalize(installLocation);
        resolvedLocation = resolved.endsWith(path.sep) ? resolved : resolved + path.sep;
    }

    async function updateInstallLocationFromCache() {
        const cachedInstallLocation = localStorage.getItem("install-location");
        if (cachedInstallLocation === null || !await exists(cachedInstallLocation)) {
            localStorage.removeItem("install-location");
            installLocation = await appDataDir();
            return;
        }

        installLocation = cachedInstallLocation;
    }

    $: (installLocation, updateResolvedLocation());

    onMount(async () => {
        await updateInstallLocationFromCache();
    });

    $: invalidInstallLocation = !installLocation;
</script>

<div
    class:hidden={!isOpen}
    class:fixed={isOpen}
    class="left-0 top-0 w-full h-full bg-black/50 flex items-center justify-center cursor-pointer"
    on:click={cancelDownload}
    on:keypress={ev => ev.key === "Enter" && cancelDownload()}
    role="none"
>
    <div class="w-128 bg-[#1b0729] px-4 py-3 rounded-lg flex flex-col items-start gap-2 cursor-default text-white" on:click={ev => ev.stopPropagation()} on:keypress={ev => ev.stopPropagation()} role="none">
        <span class="text-2xl">Configure Downloads</span>
        <div class="flex flex-col gap-2">
            <div class="flex items-center gap-2">
                <span class="text-lg">Steam Credentials</span>
                <!--<div class="text-[#8f75a1]"><QuestionMark size={14}/></div>-->
            </div>
            <p class="text-[#8f75a1] text-sm max-w-102">
                Neither your steam username or password are shared with Mouthwash servers. To download an older version of Among Us,
                <a class="hover:underline text-[#d0bfdb]" href="https://github.com/SteamRE/DepotDownloader">DepotDownloader</a> is used to connect with the steam servers to
                verify your license to own the game.
            </p>
            <div class="flex flex-col gap-2">
                <div class="bg-[#2e1440] rounded-lg flex border-2"
                    class:border-red-400={username === "" && enterDetailsError}
                    class:border-transparent={username !== "" || !enterDetailsError}
                >
                    <div class="text-[#8f75a1] p-2">
                        <UserCircle size={20}/>
                    </div>
                    <input
                        class="bg-transparent px-4 py-1 w-72 flex-1"
                        placeholder="Steam Username"
                        bind:value={username}
                    >
                </div>
                <div class="bg-[#2e1440] rounded-lg flex border-2"
                    class:border-red-400={password === "" && enterDetailsError}
                    class:border-transparent={password !== "" || !enterDetailsError}
                >
                    <div class="text-[#8f75a1] p-2">
                        <Password size={20}/>
                    </div>
                    <input
                        class="bg-transparent px-4 py-1 w-72 flex-1"
                        type="password"
                        placeholder="Steam Password"
                        bind:value={password}
                    >
                </div>
            </div>
            <p class="text-[#8f75a1] text-sm max-w-102">
                If you have Steam Guard enabled on your account, you may be asked to input the code given in your emails or app.
            </p>
        </div>
        <div class="flex flex-col gap-2">
            <div class="flex items-center gap-2">
                <span class="text-lg">Game Folder</span>
                <!--<div class="text-[#8f75a1]"><QuestionMark size={14}/></div>-->
            </div>
            <p class="text-[#8f75a1] text-sm max-w-102">
                Choose where you'd like to install the game. By default, this'll be in your AppData directory.
            </p>
            <div class="flex flex-col gap-2">
                <div class="bg-[#2e1440] rounded-lg flex border-2"
                    class:border-red-400={invalidInstallLocation}
                    class:border-transparent={!invalidInstallLocation}
                >
                    <div class="text-[#8f75a1] p-2">
                        <OpenFolder size={20}/>
                    </div>
                    <input
                        class="bg-transparent px-4 py-1 w-72 flex-1"
                        placeholder="Install Location"
                        bind:value={installLocation}
                    >
                </div>
                <p class="text-xs text-[#8f75a1] italic">Mouthwash will be installed to {resolvedLocation}Mouthwash</p>
                <button
                    class="self-start px-2 py-1 bg-[#2e1440] text-[#8f75a1] hover:text-[#d0bfdb] transition-colors rounded-lg flex items-center justify-center gap-1"
                    on:click={selectInstallationLocation}
                >
                    <Desktop size={14}/><span>Select Folder</span>
                </button>
            </div>
        </div>
        <button
            class="self-end mt-4 px-2 py-1 bg-[#2e1440] text-[#8f75a1] hover:text-[#d0bfdb] transition-colors rounded-lg flex items-center justify-center gap-1"
            on:click={finaliseConfig}
        >
            <DownloadSmall size={14}/><span>Begin Download</span>
        </button>
    </div>
</div>