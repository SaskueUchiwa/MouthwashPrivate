<script lang="ts">
    import { writable } from "svelte/store";
    import { type Game, type UserLogin, loading, unavailable, accountUrl } from "../../stores/accounts";
    import Loader from "../../icons/Loader.svelte";
    import { onMount } from "svelte";
    import GameListing from "./GameListing.svelte";
    import ArrowPath from "../../icons/ArrowPath.svelte";

    export let user: UserLogin;
    let selectedGameIdx: number = 0;
    let loadingMoreGames = false;
    let hasFoundAll = false;

    const games = writable<typeof unavailable|typeof loading|Game[]>(loading);

    async function getGames(after: Date) {
        const gamesResponse = await fetch($accountUrl + `/api/v2/users/${user.id}/games?limit=${10}&before=${after.toISOString()}`);

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

    async function getInitialGames() {
        games.set(loading);
        games.set(await getGames(new Date()) || unavailable);
        hasFoundAll = false;
        selectedGameIdx = 0;
    }

    async function loadNextPage() {
        if ($games === loading || $games === unavailable)
            return;

        loadingMoreGames = true;
        const lastGame = $games[$games.length - 1];
        console.log(lastGame);
        const newGames = await getGames(lastGame ? new Date(lastGame.started_at) : new Date());
        if (newGames && newGames.length === 0) {
            hasFoundAll = true;
            loadingMoreGames = false;
            return;
        }
        games.update(g => [...(g as Game[]), ...newGames]);
        loadingMoreGames = false;
    }

    onMount(async () => {
        await getInitialGames();
    });
</script>

<div class="flex items-center">
    {#if $games !== unavailable && $games !== loading}
        <span class="text-xs">Showing {$games.length}{hasFoundAll ? "" : "+"} game{$games.length === 1 ? "" : "s"}</span>
    {/if}
    <button
        class="rounded-3xl ml-auto order-2 bg-[#26093a] text-[#eed7ff] px-4 py-1 flex text-xs items-center justify-center gap-1 transition-colors filter hover:bg-[#1C072B] hover:text-[#bba1ce]"
        class:pointer-events-none={$games === loading}
        class:grayscale={$games === loading}
        on:click={getInitialGames}
    >
        <div class:animate-spin={$games === loading}>
            <ArrowPath size={14}/>
        </div>
        <span class="italic">Refresh</span>
    </button>
</div>
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
        <div class="flex flex-col min-h-0 gap-2 overflow-y-scroll">
            {#each $games as game, index}
                <GameListing bind:selectedGameIdx {index} {user} {game}/>
            {/each}
            <button
                class="text-[#eed7ff] px-4 py-1 flex text-xs items-center justify-center gap-1 transition-colors filter hover:text-[#bba1ce]"
                class:pointer-events-none={loadingMoreGames || hasFoundAll}
                class:grayscale={loadingMoreGames || hasFoundAll}
                on:click={loadNextPage}
            >
                {#if hasFoundAll}
                    <span class="italic">No More Games to Load</span>
                {:else}
                    <span class="italic">Load More</span>
                {/if}
            </button>
        </div>
    {/if}
{/if}