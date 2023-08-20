<script lang="ts">
    import { writable } from "svelte/store";
    import { type Game, type UserLogin, loading, unavailable, accountUrl } from "../../stores/accounts";
    import Loader from "../../icons/Loader.svelte";
    import { onMount } from "svelte";
    import GameListing from "./GameListing.svelte";

    export let user: UserLogin;
    const games = writable<typeof unavailable|typeof loading|Game[]>(loading);

    async function getGames(after: Date) {
        const gamesResponse = await fetch($accountUrl + `/api/v2/users/${user.id}/games?limit=${10}&after=${after.toISOString()}`);

        if (!gamesResponse.ok) {
            try {
                console.error(await gamesResponse.json());
            } catch (e: any) {
                console.error(e);
            }
            return undefined;
        }

        const json = await gamesResponse.json();
        if (!json.success) {
            console.error(json);
            return undefined;
        }
        return json.data as Game[];
    }

    onMount(async () => {
        games.set(await getGames(new Date()) || unavailable);
    });
</script>

{#if $games === unavailable}
    <span>Could not get games.</span>
{:else if $games === loading}
    <div class="w-full h-full flex items-center justify-center">
        <Loader size={32}/>
    </div>
{:else}
    {#if $games.length === 0}
        <span>You haven't played any games yet!</span>
    {:else}
        <div class="flex flex-col gap-2">
            {#each $games as game}
                <GameListing {game}/>
            {/each}
        </div>
    {/if}
{/if}