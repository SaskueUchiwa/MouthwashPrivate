<script lang="ts">
    import type { Player, UserLogin } from "../../../stores/accounts";

    export let user: UserLogin;
    export let player: Player;
</script>

<div class="flex items-center gap-2 max-w-35">
    <img alt="character head" src="/no-color-au-head.webp" width={16}>
    <span
        class="text-xs flex flex-wrap justify-center"
        class:text-red-400={player.role_alignment === "Impostor"}
        class:text-blue-400={player.role_alignment === "Crewmate"}
        class:text-gray={player.role_alignment === "Neutral"}
        class:font-bold={player.user_id === user.id}
    >
        <span class="block truncate max-w-35">{player.cosmetic_name || "Some player"}</span>
        {#if player.role_name !== undefined}
            ({player.role_name || "Crewmate"})
        {/if}
    </span>
</div>