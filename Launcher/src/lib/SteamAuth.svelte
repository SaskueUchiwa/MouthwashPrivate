<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import Password from "../icons/Password.svelte";
    import Check from "../icons/Check.svelte";
    import { ERR_INVALID_COMMENT } from "@zip.js/zip.js";
    const dispatchEvent = createEventDispatcher();

    let isOpen = false;
    let authCode: string;

    let lastCodeInvalid: boolean;

    export function open(wasLastCodeInvalid: boolean) {
        isOpen = true;
        lastCodeInvalid = wasLastCodeInvalid;
    }

    export function close() {
        isOpen = false;
    }
</script>

<div
    class:hidden={!isOpen}
    class:fixed={isOpen}
    class="left-0 top-0 w-full h-full bg-black/50 flex items-center justify-center"
    role="none"
>
    <div class="w-128 bg-[#1b0729] px-4 py-3 rounded-lg flex flex-col items-start gap-2 cursor-default text-white" on:click={ev => ev.stopPropagation()} on:keypress={ev => ev.stopPropagation()} role="none">
        <span class="text-2xl">Steam Auth Code</span>
        <div class="flex flex-col gap-2">
            <p class="text-[#8f75a1] text-sm max-w-102">
                {#if lastCodeInvalid}
                    The last code you provided was invalid, try again below.
                    <br><br>
                    Check your email's spam folder or restart the application if you can't find the code.
                {:else}
                    Check your steam app or emails to authenticate your sign-in to steam. It may take a few minutes to arrive.
                    <br><br>
                    If you're given a code, enter it below. This prompt may go away on its own, meaning no authentication is
                    required or you accepted the sign-in request in your app.
                {/if}
            </p>
            <div class="flex flex-col gap-2">
                <div class="bg-[#2e1440] rounded-lg flex border-2"
                >
                    <div class="text-[#8f75a1] p-2">
                        <Password size={20}/>
                    </div>
                    <input
                        class="bg-transparent px-4 py-1 w-72 flex-1"
                        placeholder="Auth Code"
                        bind:value={authCode}
                    >
                </div>
            </div>
        </div>
        <button
            class="self-end mt-4 px-2 py-1 bg-[#2e1440] text-[#8f75a1] hover:text-[#d0bfdb] transition-colors rounded-lg flex items-center justify-center gap-1"
            on:click={() => dispatchEvent("submit", authCode)}
        >
            <Check size={14}/><span>Submit</span>
        </button>
    </div>
</div>