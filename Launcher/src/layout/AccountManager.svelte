<script lang="ts">
    import Email from "../icons/Email.svelte";
    import Password from "../icons/Password.svelte";
    import Create from "../icons/Create.svelte";
    import Enter from "../icons/Enter.svelte";
    import UserCircle from "../icons/UserCircle.svelte";
    import { onMount } from "svelte";
    import type { ApiKeyInfo } from "../vite-env";
    import Mail from "../icons/Mail.svelte";

    export let loginApiInfo: ApiKeyInfo|undefined = undefined;
    export let isGameOpen: boolean;
    export let baseApiUrl: string;

    let loginEmail = "";
    let loginPassword = "";

    let signUpDisplayName = "";
    let signUpEmail = "";
    let signUpConfirmEmail = "";
    let signUpPassword = "";

    let signUpError: string|undefined = undefined;
    let badSignUpConfirmationEmail = false;
    let badSignUpDisplayName = false;
    let badSignUpPassword = false;
    let loadingSignUp = false;

    let loginError: string|undefined = undefined;
    let badLogInEmail = false;
    let badLogInPassword = false;
    let unverifiedLogInEmail = false;
    let loadingLogIn = false;

    let emailAddressToResend = "";
    let loadingResendVerification = false;
    let resendVerificationError: string|undefined = undefined;

    let loadingLogout = false;
    let logoutError: string|undefined = undefined;

    async function attemptCreateAccount() {
        badSignUpConfirmationEmail = signUpEmail.trim() !== signUpConfirmEmail.trim();
        if (badSignUpConfirmationEmail) {
            signUpError = "You must have mistyped your email, as the confirmation email doesn't match the account email."
            return;
        }

        badSignUpDisplayName = signUpDisplayName.length < 3 || signUpDisplayName.length > 24;
        if (badSignUpDisplayName) {
            signUpError = "Your display name must be between 3 and 24 characters long";
            return;
        }

        badSignUpPassword = signUpPassword.length < 8;
        if (badSignUpPassword) {
            signUpError = "Your password must be at least 8 characters long";
            return;
        }
        
        signUpError = "";

        loadingSignUp = true;
        const res = await fetch(baseApiUrl + "/api/v2/accounts", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                display_name: signUpDisplayName.trim(),
                email: signUpEmail.trim(),
                password: signUpPassword.trim()
            })
        });
        loadingSignUp = false;

        if (res.ok) {
            const json = await res.json();
            signUpDisplayName = "";
            signUpEmail = "";
            signUpConfirmEmail = "";
            signUpPassword = "";
            signUpError = undefined;
            if (!json.is_verified) {
                signUpError = "Created account. Check your emails to verify it to start playing! (You might need to check your spam folder)";
                return;
            }
            return;
        }

        try {
            const json = await res.json();
            signUpError = json.details;
        } catch (e) {
            console.log(await res.json());
            signUpError = "Couldn't create account. Contact support or try again later."
        }
    }

    async function attemptLogin() {
        emailAddressToResend = loginEmail.trim();
        unverifiedLogInEmail = false;
        badLogInEmail = loginEmail === "";
        if (badLogInEmail) {
            loginError = "Missing email to log in with";
            return;
        }
        
        badLogInPassword = loginPassword === "";
        if (badLogInPassword) {
            loginError = "Missing password to log in with";
            return;
        }

        loadingLogIn = true;
        const res = await fetch(baseApiUrl + "/api/v2/auth/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: loginEmail.trim(),
                password: loginPassword.trim()
            })
        });
        loadingLogIn = false;

        if (!res.ok) {
            loginApiInfo = null;
            try {
                const json = await res.json();
                badLogInPassword = json.details.includes("Invalid credentials");
                badLogInEmail = json.details.includes("No user with that email");
                unverifiedLogInEmail = json.details.includes("not verified");
                if (badLogInPassword) {
                    badLogInPassword = true;
                } else if (badLogInEmail) {
                    badLogInEmail = true;
                } else if (unverifiedLogInEmail) {
                    loginError = "The email address for this account has not been verified. Check your emails to verify it to start playing! (You might need to check your spam folder)";
                    return;
                }

                loginError = json.details;
            } catch (e: any) {
                console.log(e);
                loginError = "Could not login your account. Contact support or try again later."
            }
            return;
        }

        badLogInEmail = false;
        badLogInPassword = false;
        unverifiedLogInEmail = false;
        loginError = undefined;

        loginEmail = "";
        loginPassword = "";

        const json = await res.json();
        loginApiInfo = {
            ClientIdString: json.data.id,
            ClientToken: json.data.client_token,
            DisplayName: json.data.display_name,
            LoggedInDateTime: new Date().toISOString(),
            Perks: []
        };
        localStorage.setItem("cached-login", btoa(JSON.stringify(loginApiInfo)));
    }

    async function attemptResendVerification() {
        loadingResendVerification = true;
        const res = await fetch(baseApiUrl + "/api/v2/accounts/resend_verification", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: emailAddressToResend
            })
        });
        loadingResendVerification = false;

        if (!res.ok) {
            try {
                const json = await res.json();
                resendVerificationError = json.details;
            } catch (e: any) {
                console.log(e);
                resendVerificationError = "Could not re-send verification email. Contact support or try again later.";
            }
            return;
        }

        loginError = "Verification email resent! Check your emails to verify your account and start playing! (You might need to check your spam folder)";
        unverifiedLogInEmail = false;
    }

    export async function checkLoginToken() {
        const res = await fetch(baseApiUrl + "/api/v2/auth/check", {
            method: "POST",
            headers: {
                "Client-ID": loginApiInfo.ClientIdString,
                "Authorization": "Bearer " + loginApiInfo.ClientToken
            }
        });

        if (!res.ok) {
            loginApiInfo = null;
            return;
        }

        const json = await res.json();
        loginApiInfo = {
            ClientIdString: json.data.id,
            ClientToken: json.data.client_token,
            DisplayName: json.data.display_name,
            LoggedInDateTime: new Date().toISOString(),
            Perks: []
        };
        localStorage.setItem("cached-login", btoa(JSON.stringify(loginApiInfo)));
    }

    async function attemptLogout() {
        loadingLogout = true;
        const res = await fetch(baseApiUrl + "/api/v2/auth/logout", {
            method: "POST",
            headers: {
                "Client-ID": loginApiInfo.ClientIdString,
                "Authorization": "Bearer " + loginApiInfo.ClientToken
            }
        });
        loadingLogout = false;

        if (!res.ok) {
            try {
                const json = await res.json();
                logoutError = json.details;
            } catch (e: any) {
                logoutError = "Failed to log out. Contact support or try again later.";
            }
        }

        loginApiInfo = null;
        localStorage.removeItem("cached-login");
    }

    export async function loadExistingLogin() {
        const serialisedApiTokenInfo = localStorage.getItem("cached-login");
        if (serialisedApiTokenInfo === null) {
            loginApiInfo = null;
            return;
        }

        try {
            loginApiInfo = JSON.parse(atob(serialisedApiTokenInfo));
            await checkLoginToken();
        } catch (e: any) {
            loginApiInfo = null;
            localStorage.removeItem("cached-login");
            console.log(e);
        }
    }
</script>

<div class="flex-1 p-4 flex flex-col items-center">
    <span class="text-4xl mt-8">Account</span>
    {#if loginApiInfo === undefined}
        Loading..
    {:else if loginApiInfo === null}
        <div class="flex flex-col items-start gap-2">
            <p class="text-[#8f75a1] text-sm max-w-102">
                Before you start playing, you'll need an account so we can keep track of your stats and let you play safely.
            </p>
            <span class="text-2xl mt-4">Already have an account?</span>
            <div class="flex flex-col gap-2">
                <div class="bg-[#2e1440] rounded-lg flex border-2"
                    class:border-red-400={badLogInEmail}
                    class:border-transparent={!badLogInEmail}
                >
                    <div class="text-[#8f75a1] p-2">
                        <Email size={20}/>
                    </div>
                    <input class="bg-transparent px-4 py-1 w-72" placeholder="Email" bind:value={loginEmail}>
                </div>
                <div class="bg-[#2e1440] rounded-lg flex border-2"
                    class:border-red-400={badLogInPassword}
                    class:border-transparent={!badLogInPassword}
                >
                    <div class="text-[#8f75a1] p-2">
                        <Password size={20}/>
                    </div>
                    <input class="bg-transparent px-4 py-1 w-72" type="password" placeholder="Password" bind:value={loginPassword}>
                </div>
                <button
                    class="bg-[#1b0729] text-[#8f75a1] hover:(bg-[#2e1440] text-[#d0bfdb]) transition-colors rounded-lg flex items-center justify-center gap-1 filter"
                    class:pointer-events-none={loadingLogIn}
                    class:grayscale={loadingLogIn}
                    on:click={attemptLogin}
                >
                    <Enter size={14}/><span>Login</span>
                </button>
                {#if loginError !== undefined}
                    <p class="text-sm text-yellow-400 max-w-78 italic">
                        {loginError}
                    </p>
                {/if}
                {#if unverifiedLogInEmail}
                    <button
                        class="bg-[#1b0729] text-[#8f75a1] hover:(bg-[#2e1440] text-[#d0bfdb]) transition-colors rounded-lg flex items-center justify-center gap-1"
                        class:pointer-events-none={loadingResendVerification}
                        class:grayscale={loadingResendVerification}
                        on:click={attemptResendVerification}
                    >
                        <Mail size={14}/><span>Resend Verification</span>
                    </button>
                    {#if resendVerificationError !== undefined}
                        <p class="text-sm text-yellow-400 max-w-78 italic">
                            {resendVerificationError}
                        </p>
                    {/if}
                {/if}
            </div>
            <span class="text-2xl mt-4">Create an account.</span>
            <div class="flex flex-col gap-2">
                <div class="bg-[#2e1440] rounded-lg flex">
                    <div class="text-[#8f75a1] p-2">
                        <UserCircle size={20}/>
                    </div>
                    <input class="bg-transparent px-4 py-1 w-72" placeholder="Display Name" bind:value={signUpDisplayName}>
                </div>
            </div>
            <div class="flex flex-col gap-2">
                <div class="bg-[#2e1440] rounded-lg flex">
                    <div class="text-[#8f75a1] p-2">
                        <Email size={20}/>
                    </div>
                    <input class="bg-transparent px-4 py-1 w-72" placeholder="Email" bind:value={signUpEmail}>
                </div>
                <div class="bg-[#2e1440] rounded-lg flex border-2"
                    class:border-red-400={badSignUpConfirmationEmail}
                    class:border-transparent={!badSignUpConfirmationEmail}
                >
                    <div class="text-[#8f75a1] p-2">
                        <Email size={20}/>
                    </div>
                    <input class="bg-transparent px-4 py-1 w-72" placeholder="Confirm Email" bind:value={signUpConfirmEmail}>
                </div>
                <div class="bg-[#2e1440] rounded-lg flex">
                    <div class="text-[#8f75a1] p-2">
                        <Password size={20}/>
                    </div>
                    <input class="bg-transparent px-4 py-1 w-72" type="password" placeholder="Password" bind:value={signUpPassword}>
                </div>
                <button
                    class="bg-[#1b0729] text-[#8f75a1] hover:(bg-[#2e1440] text-[#d0bfdb]) transition-colors rounded-lg flex items-center justify-center gap-1 filter"
                    class:pointer-events-none={loadingSignUp}
                    class:grayscale={loadingSignUp}
                    on:click={attemptCreateAccount}
                >
                    <Create size={14}/><span>Sign Up</span>
                </button>
                {#if signUpError !== undefined}
                    <p class="text-sm text-yellow-400 max-w-78 italic">
                        {signUpError}
                    </p>
                {/if}
            </div>
        </div>
    {:else}
        <div class="flex flex-col items-center gap-2 mt-8">
            <span class="text-xl">Welcome, {loginApiInfo.DisplayName}</span>
            <button
                class="bg-[#1b0729] text-[#8f75a1] hover:(bg-[#2e1440] text-[#d0bfdb]) transition-colors rounded-lg flex items-center justify-center gap-1 filter w-48"
                class:pointer-events-none={loadingLogout || isGameOpen}
                class:grayscale={loadingLogout || isGameOpen}
                on:click={attemptLogout}
            >
                <Enter size={14}/><span>Logout</span>
            </button>
            {#if logoutError !== undefined || isGameOpen}
                <p class="text-sm text-yellow-400 max-w-78 italic">
                    {#if isGameOpen}
                        Exit your currently running game to logout of your account.
                    {:else}
                        {logoutError}
                    {/if}
                </p>
            {/if}
        </div>
    {/if}
</div>