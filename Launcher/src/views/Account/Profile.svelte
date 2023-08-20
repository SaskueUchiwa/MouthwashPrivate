<script lang="ts">
    import { createEventDispatcher } from "svelte";
    const dispatchEvent = createEventDispatcher();

    import { get } from "svelte/store";
    import ArrowLeftRect from "../../icons/ArrowLeftRect.svelte";
    import ArrowRight from "../../icons/ArrowRight.svelte";
    import Link from "../../icons/Link.svelte";
    import { accountUrl, type UserLogin } from "../../stores/accounts";

    export let user: UserLogin;

    async function logoutAccount() {
        const logoutResponse = await fetch(get(accountUrl) + "/api/v2/auth/logout", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${user.client_token}`
            }
        });

        dispatchEvent("logout");

        if (!logoutResponse.ok) {
            try {
                const json = await logoutResponse.json();
                console.log("Failed to logout", json);
            } catch (e: any) {
                console.log("Failed to logout", logoutResponse.status, e);
            }
            return;
        }
    }

    const joinDateFormat = new Intl.DateTimeFormat();
</script>

<div class="flex-1 flex flex-col items-center gap-4">
    <div class="flex flex-col items-center gap-2">
        <img alt="red-among-us" width={108} src="/red-au.webp"/>
        <span class="text-stroke-black text-white italic text-2xl">{user.display_name}</span>
    </div>
    <span class="text-[#806593] italic">Joined on {joinDateFormat.format(new Date(user.created_at))}</span>
    <div class="flex-1 flex flex-col items-stretch w-full gap-2">
        <button class="rounded-3xl bg-[#26093a] text-[#eed7ff] py-1 flex items-center justify-center gap-2 transition-colors hover:bg-[#1C072B] hover:text-[#bba1ce]">
            <span class="italic">View Recent Lobbies</span>
            <ArrowRight size={16}/>
        </button>
        <button class="rounded-3xl bg-[#26093a] text-[#eed7ff] py-1 flex items-center justify-center gap-2 transition-colors hover:bg-[#1C072B] hover:text-[#bba1ce]">
            <span class="italic">Copy Link to Profile</span>
            <Link size={16}/>
        </button>
        <button
            class="mt-auto order-2 rounded-3xl bg-transparent border-2 border-rose-800 text-rose-400 py-1 flex items-center justify-center
                gap-2 transition-colors hover:bg-rose-800/25 hover:text-rose-500"
            on:click={logoutAccount}
        >
            <span class="italic">Logout</span>
            <ArrowLeftRect size={16}/>
        </button>
    </div>
</div>