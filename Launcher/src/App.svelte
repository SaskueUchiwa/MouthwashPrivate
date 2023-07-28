<script lang="ts">
    import { appDataDir, join } from "@tauri-apps/api/path";
    import { createDir, exists, readDir, readTextFile, removeDir, renameFile, writeTextFile } from "@tauri-apps/api/fs";
    import { open as openFileDialog } from "@tauri-apps/api/dialog";
    import { Child, Command } from "@tauri-apps/api/shell";
    import { invoke } from "@tauri-apps/api";

    import "virtual:windi.css";
    import Download from "./icons/Download.svelte";
    import DownloadController from "./lib/DownloadController.svelte";
    import DownloadPercentage from "./lib/DownloadPercentage.svelte";
    import DownloadConfig from "./lib/DownloadConfig.svelte";
    import SteamAuth from "./lib/SteamAuth.svelte";
    import { onMount } from "svelte";
    import AccountManager from "./layout/AccountManager.svelte";
    import Adjustments from "./icons/Adjustments.svelte";
    import Rocket from "./icons/Rocket.svelte";
    import InstallationConfig from "./lib/InstallationConfig.svelte";
    import type { ApiKeyInfo } from "./vite-env";
    import ArrowPath from "./icons/ArrowPath.svelte";
    import ArrowUp from "./icons/ArrowUp.svelte";

    let downloadConfig: DownloadConfig;
    let steamAuth: SteamAuth;
    let installationConfig: InstallationConfig;

    let isDownloading = false;

    let isDownloadingDepot: boolean;
    let hasDownloadedDepot: boolean;
    let depotDownloadProgress: number;

    let depotDownloaderProcess: Child|undefined = undefined;

    let amongUsExePath: string|undefined = undefined;
    let amongUsInstallationPath: string|undefined = undefined;
    let amongUsProcess: Child|undefined = undefined;

    let loginApiInfo: ApiKeyInfo|undefined = undefined;

    let localInstalledModVersion: string|undefined = undefined;
    let updateAvailable: { mod_version: string; release_date: string; changelog: string[]; }|undefined = undefined;
    let isCheckingForUpdates = false;

    let isUpdating = false;

    async function moveFilesInFolder(originPath: string, destPath: string) {
        const filesInOrigin = await readDir(originPath);

        for (const file of filesInOrigin) {
            const subOriginPath = await join(originPath, file.name);
            const subDestPath = await join(destPath, file.name);
            if (Array.isArray(file.children)) {
                await createDir(subDestPath, { recursive: true });
                await moveFilesInFolder(subOriginPath, subDestPath);
            } else {
                await renameFile(subOriginPath, subDestPath);
            }
        }
    }

    async function onDepotDownload(config: { username: string; password: string; installLocation: string; }, version: string|undefined) {
        const depotDownloaderDirectory = await join(await appDataDir(), "depot");
        await removeDir(depotDownloaderDirectory, { recursive: true });

        const bepinexDirectory = await join(await appDataDir(), "bepinex");
        const dependenciesDirectory = await join(await appDataDir(), "dependencies");
        const pluginDirectory = await join(await appDataDir(), "plugin");

        await moveFilesInFolder(bepinexDirectory, config.installLocation);
        await removeDir(bepinexDirectory, { recursive: true });

        const pluginsDir = await join(config.installLocation, "BepInEx", "plugins");
        await createDir(pluginsDir, { recursive: true });
        
        await moveFilesInFolder(pluginDirectory, pluginsDir);
        await removeDir(pluginDirectory, { recursive: true });

        await moveFilesInFolder(dependenciesDirectory, pluginsDir);
        
        await removeDir(dependenciesDirectory, { recursive: true });
        await removeDir(await join(config.installLocation, ".DepotDownloader"), { recursive: true });

        await writeTextFile(await join(config.installLocation, "mod_version.txt"), version || "0.0.0");
        await checkInstallation();
        isDownloading = false;
    }

    async function downloadSequence() {
        isDownloading = true;
        const { username, password, installLocation } = await downloadConfig.getConfig();
        const remoteVersionInfo = await getLatestRemoteVersion();

        console.log("beginning download..");
        await Promise.all([
            invoke("download_file_and_extract", { url: "https://files.mouthwash.midlight.studio/DepotDownloader.zip", downloadId: "depot-downloader", folder: "depot" })
                .then(() => console.log("downloaded depot downloader")),
            invoke("download_file_and_extract", { url: "https://files.mouthwash.midlight.studio/BepInEx.zip", downloadId: "bepinex", folder: "bepinex" })
                .then(() => console.log("downloaded bepinex")),
            invoke("download_file_and_extract", { url: "https://files.mouthwash.midlight.studio/MouthwashGG.zip", downloadId: "plugin", folder: "plugin" })
                .then(() => console.log("downloaded mouthwash")),
            invoke("download_file_and_extract", { url: "https://files.mouthwash.midlight.studio/Dependencies.zip", downloadId: "dependencies", folder: "dependencies" })
                .then(() => console.log("downloaded dependencies"))
        ]);
        
        isDownloadingDepot = true;
        hasDownloadedDepot = false;

        console.log("creating directory..");
        await createDir(installLocation, { recursive: true });
        const cmd = new Command("depot-downloader-download-au", [
            "-app", "945360",
            "-depot", "945361",
            "-manifest", "3510344350358296660",
            "-username", username,
            "-password", password,
            "-dir", installLocation
        ]);

        console.log("starting depot downloader..");
        depotDownloaderProcess = await cmd.spawn();

        cmd.stdout.on("data", async buf => {
            const bufString: string = buf.toString();

            console.log(bufString);

            const percRegExp = /\d+(\.\d+)?%/;
            if (percRegExp.test(bufString)) { // Download percentage
                const percentage = bufString.match(percRegExp);
                const numberPart = percentage[0].replace(/[^0-9.]/g, "");
                const percentageNumber = parseFloat(numberPart);

                depotDownloadProgress = percentageNumber / 100;
            }

            if (bufString.includes("into Steam")) { // Logging into Steam.
                steamAuth.open(false);
            }

            if (bufString.includes("licenses")) { // Logged into steam (contains number of game licenses)
                steamAuth.close();
            }

            if (bufString.includes("not available from this account")) { // user doesn't have Among Us bought
                // error
            }

            if (bufString.includes("Downloaded")) { // Game downloaded
                isDownloadingDepot = false;
                hasDownloadedDepot = true;
                await depotDownloaderProcess.kill();
                setTimeout(() => {
                    onDepotDownload({ username, password, installLocation }, remoteVersionInfo?.mod_version);
                }, 1000);
            }
        });
        cmd.stderr.on("data", buf => {
            const bufString: string = buf.toString();

            console.log(bufString);

            if (bufString.includes("STEAM GUARD") || "confirm") {
                // steamAuth.open();

                if (bufString.includes("is incorrect")) { // invalid steam auth
                    steamAuth.open(true);
                }
            }
        });

        (window as any).provideInput = (inp: string) => depotDownloaderProcess.write(inp + "\r\n");
    }

    function onSteamAuthSubmit(ev: CustomEvent<string>) {
        depotDownloaderProcess?.write(ev.detail + "\r\n");
        steamAuth.close();
    }

    async function checkInstallation() {
        const config = await downloadConfig.getConfig();
        const checkAUPath = await join(config.installLocation, "Among Us.exe");

        if (await exists(checkAUPath)) {
            amongUsExePath = checkAUPath;
            amongUsInstallationPath = config.installLocation;

            await checkForUpdates();
        } else {
            amongUsExePath = undefined;
            amongUsInstallationPath = undefined;
        }
    }

    async function getLatestRemoteVersion() {
        const res = await fetch("https://files.mouthwash.midlight.studio/mod_version.json");
        if (!res.ok) {
            return undefined;
        }

        const remoteVersionInfo = await res.json();
        return remoteVersionInfo;
    }

    async function checkForUpdates() {
        isCheckingForUpdates = true;
        updateAvailable = undefined;
        const modVersionPath = await join(amongUsInstallationPath, "mod_version.txt");
        if (!await exists(modVersionPath)) {
            localInstalledModVersion = "Not found";
            isCheckingForUpdates = false;
            return;
        }

        const localModVersionInfo = await readTextFile(modVersionPath);
        const localModVersionParts = localModVersionInfo.split(".");
        if (localModVersionParts.length !== 3) {
            localInstalledModVersion = "Not found";
            isCheckingForUpdates = false;
            return;
        }

        localInstalledModVersion = localModVersionInfo;

        const [ localMajor, localMinor, localPatch ] = localModVersionParts.map(p => parseInt(p));
        const remoteVersionInfo = await getLatestRemoteVersion();

        if (remoteVersionInfo === undefined) {
            isCheckingForUpdates = false;
            return;
        }

        const remoteModVersionParts = remoteVersionInfo.mod_version.split(".");
        const [ remoteMajor, remoteMinor, remotePatch ] = remoteModVersionParts.map(p => parseInt(p));

        if (localMajor > remoteMajor) {
            isCheckingForUpdates = false;
            return;
        }
        if (localMinor > remoteMinor) {
            isCheckingForUpdates = false;
            return;
        }
        if (localPatch > remotePatch) {
            isCheckingForUpdates = false;
            return;
        }
        if (localMajor === remoteMajor && localMinor === remoteMinor && localPatch === remotePatch) {
            isCheckingForUpdates = false;
            return;
        }

        updateAvailable = remoteVersionInfo;
        isCheckingForUpdates = false;
    }

    onMount(async () => {
        await checkInstallation();
    });

    async function startGame() {
        const command = new Command("cmd", [ "/C", amongUsExePath ], {
            env: {
                LoginToken: btoa(JSON.stringify(loginApiInfo || null))
            }
        });
        amongUsProcess = await command.spawn();

        command.on("close", () => {
            amongUsProcess = undefined;
        });
    }
    
    async function attemptUpdate() {
        if (!updateAvailable)
            return;

        const config = await downloadConfig.getConfig();
        const pluginDirectory = await join(await appDataDir(), "plugin-" + updateAvailable.mod_version);

        isUpdating = true;

        await invoke("download_file_and_extract", {
            url: "https://files.mouthwash.midlight.studio/MouthwashGG.zip",
            downloadId: "plugin-" + updateAvailable.mod_version,
            folder: "plugin-" + updateAvailable.mod_version
        });

        isUpdating = false;

        const pluginsDir = await join(config.installLocation, "BepInEx", "plugins");
        await createDir(pluginsDir, { recursive: true });
        
        await moveFilesInFolder(pluginDirectory, pluginsDir);
        await removeDir(pluginDirectory, { recursive: true });

        await writeTextFile(await join(config.installLocation, "mod_version.txt"), updateAvailable.mod_version);
        
        await checkForUpdates();
    }

    async function uninstall() {
        await removeDir(amongUsInstallationPath, { recursive: true });
        await checkInstallation();
    }

    const requiredFiles = [ "Among Us_Data", "Among Us_Data/il2cpp_data", "BepInEx", "BepInEx/core", "BepInEx/plugins/Polus.dll", "BepInEx/plugins/PolusggSlim.dll",
        "mono", "mono/Managed", "mono/MonoBleedingEdge", "Among Us.exe", "baselib.dll", "doorstop_config.ini", "GameAssembly.dll", "UnityPlayer.dll", "winhttp.dll",
        "mod_version.txt" ];
    async function verifyInstallation(installationPath: string) {
        for (const requiredFile of requiredFiles) {
            if (!await exists(await join(installationPath, requiredFile))) {
                console.log("Missing file %s in installation", requiredFile);
                return false;
            }
        }

        return true;
    }

    let invalidInstallation = false;
    async function locateInstallation() {
        const config = await downloadConfig.getConfig();
        const folder = await openFileDialog({
            defaultPath: config.installLocation,
            directory: true
        });

        if (folder === null || folder === "" || Array.isArray(folder)) {
            return;
        }

        if (!await verifyInstallation(folder)) {
            invalidInstallation = true;
            return false;
        }

        invalidInstallation = false;
        await downloadConfig.setCachedInstallationLocation(folder);
        await checkInstallation();
    }
</script>

<DownloadConfig bind:this={downloadConfig} on:finalise-config={downloadSequence}/>
<SteamAuth bind:this={steamAuth} on:submit={onSteamAuthSubmit}/>
{#if amongUsInstallationPath !== undefined}
    <InstallationConfig
        bind:this={installationConfig}
        installLocation={amongUsInstallationPath}
        isGameOpen={amongUsProcess !== undefined}
        localInstalledModVersion={localInstalledModVersion}
        on:uninstall={uninstall}
    />
{/if}

<main class="text-white h-full flex flex-col items-center pt-8 gap-2">
    <span class="text-5xl font-medium">Mouthwash.gg</span>
    <p class="text-[#d0bfdb] max-w-196">
        A revival of Polus.GG, a private server and client for Among Us with new gamemodes and cosmetics, unleashing thousands of new ways to play.
    </p>
    <div class="flex h-full w-full">
        <AccountManager bind:loginApiInfo isGameOpen={amongUsProcess !== undefined}/>
        <div class="w-0.25 bg-white my-8"></div>
        <div class="flex-1 p-4 flex flex-col items-center">
            <span class="text-4xl mt-8">Play</span>
            {#if amongUsExePath === undefined}
                <div class="flex flex-col items-start gap-2">
                    <p class="text-[#8f75a1] text-sm max-w-102">
                        Mouthwash runs on an older version of Among Us, so you'll need to login with Steam to download it.
                        <br><br>
                        If there's anything you'd like to change about the installation, clicking the button will bring up some configuration settings.
                    </p>
                    <div class="w-full flex flex-col items-center mt-8 filter" class:grayscale={isDownloading}>
                        <div
                            class="bg-[#1b0729] text-[#8f75a1] w-24 h-24 rounded-full flex items-center justify-center cursor-pointer peer hover:text-[#d0bfdb] transition-colors filter"
                            class:pointer-events-none={isDownloading}
                            on:click={() => downloadConfig.open()}
                            on:keypress={ev => ev.key === "Enter" && downloadConfig.open()}
                            role="button"
                            tabindex="-1"
                        >
                            <Download size={24}/>
                        </div>
                        <span class="text-lg mt-4 text-[#8f75a1] peer-hover:text-[#d0bfdb] transition-colors">Download</span>
                    </div>
                </div>
                {#if isDownloading}
                    <div class="grid grid-cols-4 justify-center w-4/5 mt-8">
                        <div class="flex flex-col gap-4">
                            <DownloadController downloadId="depot-downloader" label="DepotDownloader"/>
                            <DownloadPercentage
                                speedBytesPerSecond={undefined}
                                downloadProgress={depotDownloadProgress}
                                isDownloading={isDownloadingDepot}
                                hasDownloaded={hasDownloadedDepot}
                                label="AU&nbsp;v2021.6.30"
                            />
                        </div>
                        <DownloadController downloadId="bepinex" label="BepInEx"/>
                        <DownloadController downloadId="plugin" label="Mouthwash"/>
                        <DownloadController downloadId="dependencies" label="Dependencies"/>
                    </div>
                {:else}
                    <!-- svelte-ignore a11y-invalid-attribute -->
                    <a
                        class="hover:underline mt-4 text-xs text-[#d0bfdb] italic"
                        href="#"
                        on:click={locateInstallation}
                    >Already have Mouthwash installed? Click here to locate it.</a>
                    {#if invalidInstallation}
                        <p class="text-sm text-yellow-400 max-w-102 italic">
                            The folder you selected doesn't seem like a Mouthwash installation, try another folder or download the game again.
                        </p>
                    {/if}
                {/if}
            {:else}
                <div class="flex flex-col gap-4 items-center">
                    {#if isUpdating && updateAvailable}
                        <!-- svelte-ignore a11y-positive-tabindex -->
                        <div
                            class="flex flex-col items-center mt-8 filter border-2 p-4 rounded-lg border-[#8f75a1] group cursor-pointer w-42 transition-colors hover:bg-[#8f75a125]"
                            on:click={() => startGame()}
                            on:keypress={ev => ev.key === "Enter" && startGame()}
                            role="button"
                            tabindex="3"
                        >
                            <DownloadController downloadId="plugin-{updateAvailable.mod_version}" label="" isBig={true}/>
                            <span class="text-lg mt-4 text-[#8f75a1] group-hover:text-[#d0bfdb] transition-colors">Updating..</span>
                        </div>
                    {:else}
                        <!-- svelte-ignore a11y-positive-tabindex -->
                        <div
                            class="flex flex-col items-center mt-8 filter border-2 p-4 rounded-lg border-[#8f75a1] group cursor-pointer w-42 transition-colors hover:bg-[#8f75a125]"
                            class:grayscale={amongUsProcess !== undefined || loginApiInfo === undefined || loginApiInfo === null}
                            class:pointer-events-none={amongUsProcess !== undefined || loginApiInfo === undefined || loginApiInfo === null}
                            on:click={() => startGame()}
                            on:keypress={ev => ev.key === "Enter" && startGame()}
                            role="button"
                            tabindex="3"
                        >
                            <div class="bg-[#2e1440] text-[#8f75a1] w-24 h-24 rounded-full flex items-center justify-center peer group-hover:text-[#d0bfdb] border-[#8f75a1] transition-colors">
                                <Rocket size={24}/>
                            </div>
                            <span class="text-lg mt-4 text-[#8f75a1] group-hover:text-[#d0bfdb] transition-colors">Launch Game</span>
                        </div>
                    {/if}
                    {#if loginApiInfo === null}
                        <p class="text-sm text-yellow-400 italic">
                            Login to an account before playing.
                        </p>
                    {/if}
                    {#if updateAvailable}
                        <button
                            class="flex items-center filter border-2 p-2 rounded-lg border-yellow-400 group cursor-pointer w-42 hover:bg-yellow-400/15"
                            on:click={attemptUpdate}
                            class:grayscale={isUpdating}
                            class:pointer-events-none={isUpdating}
                        >
                            <!-- svelte-ignore a11y-positive-tabindex -->
                            <div
                                class="text-yellow-300 p-2 rounded-full flex items-center justify-center peer group-hover:text-yellow-400 transition-colors"
                            >
                                <ArrowUp size={16}/>
                            </div>
                            <span class="text-xs text-yellow-300 group-hover:text-yellow-400 transition-colors text-center">Update to v{updateAvailable.mod_version}</span>
                        </button>
                    {:else}
                        <button
                            class="flex items-center filter border-2 p-2 rounded-lg border-[#8f75a1] group cursor-pointer w-42 hover:bg-[#8f75a125]"
                            class:grayscale={isCheckingForUpdates}
                            class:pointer-events-none={isCheckingForUpdates}
                            on:click={checkForUpdates}
                        >
                            <!-- svelte-ignore a11y-positive-tabindex -->
                            <div
                                class="text-[#8f75a1] p-2 rounded-full flex items-center justify-center peer group-hover:text-[#d0bfdb] transition-colors"
                                class:animate-spin={isCheckingForUpdates}
                            >
                                <ArrowPath size={16}/>
                            </div>
                            <span class="text-xs text-[#8f75a1] group-hover:text-[#d0bfdb] transition-colors text-center">Check For Updates</span>
                        </button>
                    {/if}
                    <button
                        class="flex items-center filter border-2 p-2 rounded-lg border-[#8f75a1] group cursor-pointer w-42 hover:bg-[#8f75a125]"
                        on:click={() => installationConfig.open()}
                    >
                        <!-- svelte-ignore a11y-positive-tabindex -->
                        <div class="text-[#8f75a1] p-2 rounded-full flex items-center justify-center peer group-hover:text-[#d0bfdb] transition-colors">
                            <Adjustments size={16}/>
                        </div>
                        <span class="text-xs text-[#8f75a1] group-hover:text-[#d0bfdb] transition-colors text-center">Manage Installation</span>
                    </button>
                </div>
                <!-- <div class="flex flex-col items-start text-xs mt-8">
                    svelte-ignore a11y-positive-tabindex -->
                    <!-- <div
                        class="text-[#8f75a1] hover:text-[#d0bfdb] flex items-center cursor-pointer"
                        on:click={() => isInstallationInfoOpen = !isInstallationInfoOpen}
                        on:keypress={ev => ev.key === "Enter" && (isInstallationInfoOpen = !isInstallationInfoOpen)}
                        tabindex="4"
                        role="button"
                    >
                        <span>Installation Info</span>
                        {#if isInstallationInfoOpen}
                            <ChevronDown size={12}/>
                        {:else}
                            <ChevronRight size={12}/>
                        {/if}
                    </div>
                    <div class="text-[#8f75a1] text-xs flex flex-col items-start" class:invisible={!isInstallationInfoOpen}>
                        <span class="w-168">Executable Path: {amongUsExePath}</span>
                    </div>
                </div> -->
            {/if}
        </div>
    </div>
</main>

<style>
    :global(html, body, #app) {
        margin: 0;
        padding: 0;
        width: 100vw;
        height: 100vh;
        overflow-x: hidden;
        background-color: #0c0213;
        font-family: "Josefin Sans", sans-serif;
    }
</style>

<!--
Download
========
Depot Downloader
|-> Among Us 2021.6.30

BepInEx 7f1f139aea11beccae05928371fdec20cfc01bba

Polus.dll
PolusggSlim.dll

Newtonsoft.Json.dll
-->