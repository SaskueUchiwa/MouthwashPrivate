<script lang="ts">
    import { appDataDir, join } from "@tauri-apps/api/path";
    import { createDir, exists, readDir, removeDir, renameFile } from "@tauri-apps/api/fs";
    import { Child, Command } from "@tauri-apps/api/shell";
    import { invoke } from "@tauri-apps/api";

    import "virtual:windi.css";
    import Download from "./icons/Download.svelte";
    import DownloadController from "./lib/DownloadController.svelte";
    import DownloadPercentage from "./lib/DownloadPercentage.svelte";
    import DownloadConfig from "./lib/DownloadConfig.svelte";
    import SteamAuth from "./lib/SteamAuth.svelte";
    import { onMount } from "svelte";
    import Lightning from "./icons/Lightning.svelte";
    import ChevronDown from "./icons/ChevronDown.svelte";
    import ChevronRight from "./icons/ChevronRight.svelte";
    import AccountManager from "./layout/AccountManager.svelte";
    import Adjustments from "./icons/Adjustments.svelte";
    import Rocket from "./icons/Rocket.svelte";

    let downloadConfig: DownloadConfig;
    let steamAuth: SteamAuth;

    let isDownloadingDepot: boolean;
    let hasDownloadedDepot: boolean;
    let depotDownloadProgress: number;

    let depotDownloaderProcess: Child|undefined = undefined;

    let amongUsExePath: string|undefined = undefined;
    let amongUsProcess: Child|undefined = undefined;

    let loginUsername: string|null|undefined;

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

    async function onDepotDownload(config: { username: string; password: string; installLocation: string; }) {
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

        await renameFile(
            await join(dependenciesDirectory, "Bin", "netstandard2.0", "Newtonsoft.Json.dll"),
            await join(pluginsDir, "Newtonsoft.Json.dll")
        );
        
        await removeDir(dependenciesDirectory, { recursive: true });

        checkInstallation();
    }

    async function downloadSequence() {
        const { username, password, installLocation } = await downloadConfig.getConfig();

        console.log("beginning download..");
        await Promise.all([
            invoke("download_file_and_extract", { url: "http://65.109.160.245/DepotDownloader-windows-x64.zip", downloadId: "depot-downloader", folder: "depot" })
                .then(() => console.log("downloaded depot downloader")),
            invoke("download_file_and_extract", { url: "http://65.109.160.245/BepInEx_UnityIL2CPP_x86_7f1f139_6.0.0-be.510.zip", downloadId: "bepinex", folder: "bepinex" })
                .then(() => console.log("downloaded bepinex")),
            invoke("download_file_and_extract", { url: "http://65.109.160.245/MouthwashGG.zip", downloadId: "plugin", folder: "plugin" })
                .then(() => console.log("downloaded mouthwash")),
            invoke("download_file_and_extract", { url: "http://65.109.160.245/Json130r3.zip", downloadId: "dependencies", folder: "dependencies" })
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
                    onDepotDownload({ username, password, installLocation });
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

        (window as any).provideInput = (inp: string) => depotDownloaderProcess.write(inp + "\n");
    }

    function onSteamAuthSubmit(ev: CustomEvent<string>) {
        depotDownloaderProcess?.write(ev.detail + "\n");
        steamAuth.close();
    }

    async function checkInstallation() {
        const config = await downloadConfig.getConfig();
        const checkAUPath = await join(config.installLocation, "Among Us.exe");

        if (await exists(checkAUPath)) {
            amongUsExePath = checkAUPath;
        } else {
            amongUsExePath = undefined;
        }
    }

    onMount(async () => {
        checkInstallation();
    });

    async function startGame() {
        const command = new Command("cmd", [ "/C", amongUsExePath ], {
            env: {
                LoginToken: "eyJDbGllbnRJZFN0cmluZyI6IjI5ZmIxMWE3LThlYTEtNDY2Yi1iYjM3LWI1OTIxNGZjOGY4NSIsIkNsaWVudFRva2VuIjoiN2U0MjdiMTM2NTA5NGFmOWFlN2IxNTgxNjk3ODdmOTU3ZDlmMjE2OWM1NjVmMzE3ZjRhMTk4MTdlOTdmYWIyMCIsIkRpc3BsYXlOYW1lIjoiZmVtYm95IiwiUGVya3MiOltdLCJMb2dnZWRJbkRhdGVUaW1lIjoiMjAyMy0wNy0yNVQyMzozODoxNS4yMjYxMTA4KzAxOjAwIn0="
            }
        });
        amongUsProcess = await command.spawn();

        command.on("close", () => {
            amongUsProcess = undefined;
        });
    }
</script>

<DownloadConfig bind:this={downloadConfig} on:finalise-config={downloadSequence}/>
<SteamAuth bind:this={steamAuth} on:submit={onSteamAuthSubmit}/>

<main class="text-white h-full flex flex-col items-center pt-8 gap-2">
    <span class="text-5xl font-medium">Mouthwash.gg</span>
    <p class="text-[#d0bfdb] max-w-196">
        A revival of Polus.GG, a private server and client for Among Us with new gamemodes and cosmetics, unleashing thousands of new ways to play.
    </p>
    <div class="flex h-full w-full">
        <AccountManager bind:loginUsername/>
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
                    <div class="w-full flex flex-col items-center mt-8">
                        <div
                            class="bg-[#1b0729] text-[#8f75a1] w-24 h-24 rounded-full flex items-center justify-center cursor-pointer peer hover:text-[#d0bfdb] transition-colors"
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
                <div class="flex flex-col gap-4">
                    <!-- svelte-ignore a11y-positive-tabindex -->
                    <div
                        class="flex flex-col items-center mt-8 filter border-2 p-4 rounded-lg border-[#8f75a1] group cursor-pointer w-42 transition-colors hover:bg-[#8f75a125]"
                        class:grayscale={amongUsProcess !== undefined}
                        class:pointer-events-none={amongUsProcess !== undefined}
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
                    <div class="flex items-center filter border-2 p-2 rounded-lg border-[#8f75a1] group cursor-pointer w-42 hover:bg-[#8f75a125]">
                        <!-- svelte-ignore a11y-positive-tabindex -->
                        <div
                            class="text-[#8f75a1] p-2 rounded-full flex items-center justify-center peer group-hover:text-[#d0bfdb] transition-colors"
                            on:click={() => startGame()}
                            on:keypress={ev => ev.key === "Enter" && startGame()}
                            role="button"
                            tabindex="3"
                        >
                            <Adjustments size={16}/>
                        </div>
                        <span class="text-xs text-[#8f75a1] group-hover:text-[#d0bfdb] transition-colors text-center">Manage Installation</span>
                    </div>
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