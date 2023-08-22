<script lang="ts">
    import { onMount } from "svelte";
    import Loader from "../../icons/Loader.svelte";
    import Profile from "./Profile.svelte";
    import LoginSection from "./LoginSection.svelte";
    import SignUpSection from "./SignUpSection.svelte";
    import { accountUrl, loading, unavailable, user, type UserLogin } from "../../stores/accounts";
    import { get } from "svelte/store";
    import UserGames from "./UserGames.svelte";
    
    let currentPage: ""|"games" = "";

    async function checkLogin(userLogin: UserLogin) {
        const checkLoginResponse = await fetch(get(accountUrl) + "/api/v2/auth/check", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${userLogin.client_token}`
            }
        });

        if (!checkLoginResponse.ok) {
            try {
                const json = await checkLoginResponse.json();
                if (json.code === "MISSING_HEADER") {
                    console.error("Missing an 'Authorization' header?", json);
                } else if (json.code === "UNAUTHORIZED") {
                    console.error("Login no longer valid, and that's okay.", json);
                } else if (json.code === "INTERNAL_SERVER_ERROR") {
                    console.error("The server encountered an error .", json);
                } else {
                    console.error("Unknown error", json);
                }
            } catch (e: any) {
                console.error(e);
            }
            localStorage.removeItem("user-login");
            user.set(unavailable);
            return;
        }

        try {
            const json = await checkLoginResponse.json();
            if (json.success) {
                user.set(json.data);
                localStorage.setItem("user-login", JSON.stringify(json.data));
                return;
            }
            console.error(json);
        } catch (e: any) {
            console.error(e);
            localStorage.removeItem("user-login");
            user.set(unavailable);
        }
    }

    onMount(async () => {
        const userLogin = localStorage.getItem("user-login");
        if (userLogin !== null) {
            user.set(loading);
            try {
                const json = JSON.parse(userLogin);
                await checkLogin(json);
            } catch (e: any) {
                console.error(e);
            }
        } else {
            user.set(unavailable);
        }
    });

    function onLogOut() {
        user.set(unavailable);
        localStorage.removeItem("user-login");
    }

    function setPage(page: ""|"games") {
        currentPage = page;
    }

    function onSetPage(ev: CustomEvent<""|"games">) {
        setPage(ev.detail);
    }
</script>

<div class="min-h-0 flex gap-4 self-stretch h-full">
    <div class="flex-1 flex flex-col bg-[#06000a] rounded-xl p-4 px-6 gap-4">
        {#if $user === loading}
            <div class="flex-1 flex items-center justify-center text-[#806593]">
                <Loader size={32}/>
            </div>
        {:else}
            <span class="text-xl font-semibold">Profile</span>
            {#if $user === unavailable}
                <div class="flex-1 flex items-center justify-center">
                    <span class="text-[#806593] italic">Not logged in.</span>
                </div>
            {:else if $user}
                <Profile user={$user} page={currentPage} on:logout={onLogOut} on:set-page={onSetPage}/>
            {/if}
        {/if}
    </div>
    <div class="min-h-0 flex-[3_0_0] flex flex-col gap-4">
        {#if $user !== loading && $user !== unavailable}
            <div class="flex items-center bg-[#06000a] rounded-xl p-4 px-6 gap-2">
                {#if currentPage === ""}
                    <span class="text-xl font-semibold">Cosmetics</span>
                {:else if currentPage === "games"}
                    <span class="text-xl font-semibold">Recent Games</span>
                {/if}
            </div>
        {/if}
        <div class="min-h-0 flex-1 flex flex-col bg-[#06000a] rounded-xl p-4 px-6 gap-2">
            {#if $user === loading}
                <div class="flex-1 flex items-center justify-center text-[#806593]">
                    <Loader size={32}/>
                </div>
            {:else}
                {#if $user === unavailable}
                    <LoginSection/>
                    <SignUpSection/>
                {:else}
                    {#if currentPage === ""}
                        <span class="italic">You have 0 cosmetics</span>
                    {:else if currentPage === "games"}
                        <UserGames user={$user}/>
                    {/if}
                {/if}
            {/if}
        </div>
    </div>
</div>