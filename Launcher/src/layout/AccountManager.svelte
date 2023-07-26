<script lang="ts">
    import Email from "../icons/Email.svelte";
    import Password from "../icons/Password.svelte";
    import Create from "../icons/Create.svelte";
    import Enter from "../icons/Enter.svelte";

    export let loginUsername: string|null|undefined = null;
</script>

<div class="flex-1 p-4 flex flex-col items-center">
    <span class="text-4xl mt-8">Account</span>
    {#if loginUsername === undefined}
        Loading..
    {:else if loginUsername === null}
        <div class="flex flex-col items-start gap-2">
            <p class="text-[#8f75a1] text-sm max-w-102">
                Before you start playing, you'll need an account so we can keep track of your stats and let you play safely.
            </p>
            <span class="text-2xl mt-4">Already have an account?</span>
            <div class="flex flex-col gap-2">
                <div class="bg-[#2e1440] rounded-lg flex">
                    <div class="text-[#8f75a1] p-2">
                        <Email size={20}/>
                    </div>
                    <input class="bg-transparent px-4 py-1 w-72" placeholder="Email">
                </div>
                <div class="bg-[#2e1440] rounded-lg flex">
                    <div class="text-[#8f75a1] p-2">
                        <Password size={20}/>
                    </div>
                    <input class="bg-transparent px-4 py-1 w-72" type="password" placeholder="Password">
                </div>
                <button class="bg-[#1b0729] text-[#8f75a1] hover:(bg-[#2e1440] text-[#d0bfdb]) transition-colors rounded-lg flex items-center justify-center gap-1">
                    <Enter size={14}/><span>Login</span>
                </button>
            </div>
            <span class="text-2xl mt-4">Create an account.</span>
            <div class="flex flex-col gap-2">
                <div class="bg-[#2e1440] rounded-lg flex">
                    <div class="text-[#8f75a1] p-2">
                        <Email size={20}/>
                    </div>
                    <input class="bg-transparent px-4 py-1 w-72" placeholder="Email">
                </div>
                <div class="bg-[#2e1440] rounded-lg flex">
                    <div class="text-[#8f75a1] p-2">
                        <Email size={20}/>
                    </div>
                    <input class="bg-transparent px-4 py-1 w-72" placeholder="Confirm Email">
                </div>
                <div class="bg-[#2e1440] rounded-lg flex">
                    <div class="text-[#8f75a1] p-2">
                        <Password size={20}/>
                    </div>
                    <input class="bg-transparent px-4 py-1 w-72" type="password" placeholder="Password">
                </div>
                <button class="bg-[#1b0729] text-[#8f75a1] hover:(bg-[#2e1440] text-[#d0bfdb]) transition-colors rounded-lg flex items-center justify-center gap-1">
                    <Create size={14}/><span>Sign Up</span>
                </button>
            </div>
        </div>
    {:else}
        <span>Welcome, {loginUsername}</span>
    {/if}
</div>