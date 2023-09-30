<script lang="ts">
    import type { Bundle } from "../../stores/accounts";

    export let bundleInfo: Bundle & { owned_at: string; };
    
    const boughtAtFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
</script>

<div class="flex items-center gap-2">
    <img src={bundleInfo.thumbnail_url} alt={bundleInfo.name} width={72} class="rounded-lg"/>
    <div class="flex flex-col">
        <span class="text-xl">{bundleInfo.name}</span>
        <span class="text-[#806593] italic text-sm">
            Bought on {boughtAtFormat.format(new Date(bundleInfo.owned_at))}, {bundleInfo.num_items} item{bundleInfo.num_items === 1 ? "" : "s"}
        </span>
    </div>
</div>