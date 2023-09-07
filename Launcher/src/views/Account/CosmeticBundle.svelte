<script lang="ts">
    import type { BundleItem } from "../../stores/accounts";

    export let bundleItems: BundleItem[];

    $: bundleInfo = bundleItems[0];
    
    const boughtAtFormat = new Intl.DateTimeFormat("en-US");
</script>

<div class="flex items-center gap-2">
    <img src={bundleInfo.thumbnail_url} alt={bundleInfo.bundle_name} width={48} class="rounded-lg"/>
    <div class="flex flex-col">
        <span>{bundleInfo.bundle_name} Bundle</span>
        <span class="text-[#806593] italic text-xs">
            Bought at {boughtAtFormat.format(new Date(bundleInfo.owned_at))}, {bundleItems.length} item{bundleItems.length === 1 ? "" : "s"}
        </span>
    </div>
</div>