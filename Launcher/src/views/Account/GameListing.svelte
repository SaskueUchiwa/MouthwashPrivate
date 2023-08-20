<script lang="ts">
    import type { Game } from "../../stores/accounts";

    export let game: Game;

    const map = game.game_settings?.[".Map"]?.options[game.game_settings?.[".Map"]?.selectedIdx];
    const gamemode = game.game_settings?.[".Gamemode"]?.options[game.game_settings?.[".Gamemode"]?.selectedIdx];
</script>

<div class="flex items-center gap-4 bg-[#0c0213] px-4 py-2 rounded-lg">
    <div class="flex flex-col">
        <div class="flex items-center gap-2">
            <span>{map || "The Skeld"}</span>
            <span class="text-xs px-2 py-0.5 rounded-xl bg-[#27063e]">{gamemode || "Hide N' Seek"}</span>
        </div>
    </div>
</div>