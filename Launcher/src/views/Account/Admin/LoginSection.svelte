<script lang="ts">
    import { get } from "svelte/store";
    import Email from "../../../icons/Email.svelte";
    import Key from "../../../icons/Key.svelte";
    import { accountUrl, user } from "../../../stores/accounts";
    import ErrorNotes from "./ErrorNotes.svelte";
    
    let errorMessages: string[] = [];
    let erroredInputs: Set<string> = new Set;

    let email = "";
    let password = "";

    let unverifiedEmail: string|null = null;

    let loadingLogin = false;
    async function logInToAccount() {
        erroredInputs = new Set;
        errorMessages = [];
        unverifiedEmail = null;
        sendUnverifiedEmailErrorMessages = [];
        sendUnverifiedEmailSuccessMessages = [];

        loadingLogin = true;
        const loginResponse = await fetch(get(accountUrl) + "/api/v2/auth/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                password
            })
        });
        loadingLogin = false;

        if (!loginResponse.ok) {
            try {
                const json = await loginResponse.json();
                if (json.code === "INVALID_BODY") {
                    const badEmail = json.details.find(detail => detail.path.length === 1 && detail.path[0] === "email");
                    const badPassword = json.details.find(detail => detail.path.length === 1 && detail.path[0] === "password");
                    if (badEmail) {
                        if (badEmail) {
                            erroredInputs.add("email");
                            if (badEmail.code === "missing") {
                                errorMessages.push("You need to enter an email to login with.");
                            } else {
                                errorMessages.push("The email you entered isn't valid. Make sure you've entered it in correctly.");
                            }
                        }
                    }
                    if (badPassword) {
                        erroredInputs.add("password");
                        if (badPassword.code === "missing") {
                            errorMessages.push("You need to enter a password to secure your account, being at least 8 characters long.");
                        } else {
                            errorMessages.push("The password you entered is invalid.");
                        }
                    }
                    if (!badEmail && !badPassword) {
                        console.error(json);
                        throw new Error("Invalid body but no fields recognised?");
                    }
                } else if (json.code === "UNAUTHORIZED") {
                    errorMessages.push("The credentials you entered don't have an account. Make sure you've entered your password correctly."); // TODO: Reset password
                } else if (json.code === "FORBIDDEN") {
                    unverifiedEmail = email;
                    errorMessages.push("You need to verify your email address before you can use your account");
                } else if (json.code === "INTERNAL_SERVER_ERROR") {
                    errorMessages.push("There was an issue in the server while logging into your account, try again later or contact support.");
                }
            } catch (e: any) {
                console.error(e);
                errorMessages.push("There was an issue while logging into your account, try again later or contact support.");
            }
            errorMessages = errorMessages;
            erroredInputs = erroredInputs;
            return;
        }

        try {
            const json = await loginResponse.json();
            if (json.success) {
                user.set(json.data);
                email = "";
                password = "";
                localStorage.setItem("user-login", JSON.stringify(json.data));
                return;
            }
            console.error(json);
        } catch (e: any) {
            console.error(e);
        }
        errorMessages.push("Could not login to your account for some reason, try again later or contact support.");
    }

    let sendUnverifiedEmailErrorMessages: string[] = [];
    let sendUnverifiedEmailSuccessMessages: string[] = [];

    let loadingVerification = false;
    async function resendVerification() {
        erroredInputs = new Set;
        sendUnverifiedEmailErrorMessages = [];
        sendUnverifiedEmailSuccessMessages = [];

        loadingVerification = true;
        const sendVerificationResponse = await fetch(get(accountUrl) + "/api/v2/accounts/resend_verification", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: unverifiedEmail
            })
        });
        loadingVerification = false;

        if (!sendVerificationResponse.ok) {
            try {
                const json = await sendVerificationResponse.json();
                console.error("Failed to send verification email", json);
                if (json.code === "INVALID_BODY") {
                    erroredInputs.add("email");
                    sendUnverifiedEmailErrorMessages.push("Invalid email address used, make sure that the email you used is typed correctly.");
                } else if (json.code === "USER_NOT_FOUND") {
                    sendUnverifiedEmailErrorMessages.push("For some reason, the user to send the verification email to could not be found, please contact support.");
                } else if (json.code === "TOO_MANY_VERIFICATION_EMAILS") {
                    sendUnverifiedEmailErrorMessages.push("You must wait 2 minutes before sending another verification email. Check your spam folder if you can't find the one already sent.");
                } else if (json.code === "INTERNAL_SERVER_ERROR") {
                    sendUnverifiedEmailErrorMessages.push("There was an error in the server while re-sending the verification email. Please try again later or contact support.");
                }
            } catch (e: any) {
                console.error(e);
                sendUnverifiedEmailErrorMessages.push("There was an error in the server while re-sending the verification email. Please try again later or contact support.");
            }
            erroredInputs = erroredInputs;
            sendUnverifiedEmailErrorMessages = sendUnverifiedEmailErrorMessages;
            return;
        }

        try {
            const json = await sendVerificationResponse.json();
            if (json.success) {
                sendUnverifiedEmailSuccessMessages.push("Successfully sent verification email! Check your inbox, including your spam folder, to verify your account.");
                sendUnverifiedEmailSuccessMessages = sendUnverifiedEmailSuccessMessages;
                return;
            }
        } catch (e: any) {
            console.error(e);
        }
        sendUnverifiedEmailErrorMessages.push("There was an error in the server while re-sending the verification email. Please try again later or contact support.");
        sendUnverifiedEmailErrorMessages = sendUnverifiedEmailErrorMessages;
    }
</script>

<span class="text-xl font-semibold">Login to Account</span>
<div class="flex gap-4">
    <div class="flex flex-col gap-2 items-start">
        <div class="flex flex-col gap-1 items-end">
            <div class="flex border-2 border-transparent rounded-lg" class:border-red-500={erroredInputs.has("email")}>
                <div class="p-2 bg-card-200 rounded-l-lg"><Email size={20}/></div>
                <input class="border-none font-inherit text-inherit text-md outline-none rounded-r-lg bg-card-200 w-64" placeholder="Email" bind:value={email}>
            </div>
            <div class="flex border-2 border-transparent rounded-lg" class:border-red-500={erroredInputs.has("password")}>
                <div class="p-2 bg-card-200 rounded-l-lg"><Key size={20}/></div>
                <input class="border-none font-inherit text-inherit text-md outline-none rounded-r-lg bg-card-200 w-64" placeholder="Password" type="password" bind:value={password}>
            </div>
            <button class="rounded-lg bg-card-200 px-4 py-1 hover:bg-card-300 hover:text-text-300 filter border-none font-inherit text-inherit text-inherit cursor-pointer"
                class:grayscale={loadingLogin}
                class:pointer-events-none={loadingLogin}
                on:click={logInToAccount}
            >
                Login
            </button>
        </div>
    </div>
    <div class="w-0.25 self-stretch bg-white/25"></div>
    <div class="flex flex-col gap-0.5 text-xs italic">
        <ul class="text-text-300 max-w-84 px-4 list-disc">
            <li class="my-0.5">Log-in to an existing PGG: Rewritten account</li>
            <li class="my-0.5">If you don't have an account, use the form below</li>
            <li class="my-0.5">You'll need to log-in before you can play</li>
        </ul>
        <ErrorNotes successMessages={[]} {errorMessages}/>
        {#if unverifiedEmail}
            <button class="rounded-lg bg-card-200 px-4 py-1 hover:bg-card-300 hover:text-text-300 filter border-none font-inherit text-inherit cursor-pointer"
                class:grayscale={loadingVerification}
                class:pointer-events-none={loadingVerification}
                on:click={resendVerification}
            >
                Resend Verification
            </button>
        {/if}
        <ErrorNotes successMessages={sendUnverifiedEmailSuccessMessages} errorMessages={sendUnverifiedEmailErrorMessages}/>
    </div>
</div>