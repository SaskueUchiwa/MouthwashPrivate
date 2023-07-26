<script lang="ts">
    import Check from "../icons/Check.svelte";
    import Download from "../icons/Download.svelte";

    export let speedBytesPerSecond: number|undefined;
    export let downloadProgress: number;
    export let isDownloading: boolean;
    export let hasDownloaded: boolean;
    export let label: string;
</script>

<div class="w-full flex flex-col items-center">
    <div class="bg-[#1b0729] text-[#8f75a1] w-16 h-16 rounded-full flex items-center justify-center cursor-pointer peer hover:text-[#d0bfdb] transition-colors">
        {#if isDownloading}
            <div class="flex flex-col items-center text-emerald-400">
                {#if isNaN(downloadProgress)}
                    <span class="text-md">0%</span>
                {:else}
                    <span class="text-md">{(downloadProgress * 100).toFixed(1)}%</span>
                {/if}
                {#if speedBytesPerSecond !== undefined}
                    <span class="text-xs">{(speedBytesPerSecond / 1000 / 1000).toFixed(1)} MB/s</span>
                {/if}
            </div>
        {:else if hasDownloaded}
            <span class="text-emerald-300">
                <Check size={24}/>
            </span>
        {:else}
            <Download size={16}/>
        {/if}
    </div>
    <span class="text-sm mt-4 text-[#8f75a1] peer-hover:text-[#d0bfdb] transition-colors">{label}</span>
</div>