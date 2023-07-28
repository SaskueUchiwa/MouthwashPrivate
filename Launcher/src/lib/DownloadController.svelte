<script lang="ts">
    import { appWindow } from "@tauri-apps/api/window";
    import DownloadPercentage from "./DownloadPercentage.svelte";

    export let label: string;
    export let downloadId = "";
    export let isBig = false;

    let downloadProgress = 0;
    let isDownloading = false;
    let hasDownloaded = false;
    let speedBytesPerSecond = 0;

    appWindow.listen("mwgg://start-download", ev => {
        if (ev.payload !== downloadId) return;

        isDownloading = true;
        hasDownloaded = false;
    });

    appWindow.listen("mwgg://download-progress", ev => {
        const payload = ev.payload as { download_ratio: number; bytes_per_second: number; download_id: string; };
        if (payload.download_id !== downloadId) return;

        downloadProgress = payload.download_ratio;
        speedBytesPerSecond = payload.bytes_per_second;
    });

    appWindow.listen("mwgg://finish-download", ev => {
        if (ev.payload !== downloadId) return;

        isDownloading = false;
        hasDownloaded = true;
    });
</script>

<DownloadPercentage {speedBytesPerSecond} {downloadProgress} {isDownloading} {hasDownloaded} {label} {isBig}/>