using System;
using System.Collections;
using System.IO;
using System.Net.Http;
using System.Text.Json;
using System.Text.Json.Serialization;
using Reactor.Utilities;
using UnityEngine;
using UnityEngine.Networking;

namespace MouthwashClient.Services
{
    public class UserInformation
    {
        [JsonPropertyName("id")]
        public string Id { get; set; }
        [JsonPropertyName("email")]
        public string Email { get; set; }
        [JsonPropertyName("created_at")]
        public string CreatedAt { get; set; }
        [JsonPropertyName("banned_until")]
        public string? BannedUntil { get; set; }
        [JsonPropertyName("muted_until")]
        public string? MutedUntil { get; set; }
        [JsonPropertyName("email_verified")]
        public bool EmailVerified { get; set; }
        [JsonPropertyName("display_name")]
        public string DisplayName { get; set; }
        [JsonPropertyName("cosmetic_hat")]
        public int CosmeticHat { get; set; }
        [JsonPropertyName("cosmetic_pet")]
        public int CosmeticPet { get; set; }
        [JsonPropertyName("cosmetic_skin")]
        public int CosmeticSkin { get; set; }
    }

    public class UserInformationWithAuthToken : UserInformation
    {
        [JsonPropertyName("client_token")]
        public string ClientToken { get; set; }
    }

    public class StandardApiResponse<T>
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }
        [JsonPropertyName("data")]
        public T Data { get; set; }
    }
    
    public static class LoginService
    {
        private static UserInformationWithAuthToken? _cachedUserInformation;
        public static string ErrorWhileLoggingIn = "";

        public static Action<string> ErrorCallback;
        public static Action DoneCallback;

        public static void ErrorPopup(string text)
        {
            ErrorWhileLoggingIn = text;
        }
        
        public static IEnumerator Initialize()
        {
            _cachedUserInformation = null;
            
            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage($"Checking user credentials..");
            
            LoginUserCredentials? userCredentials = CredentialsService.GetLoginUserCredentials();
            if (userCredentials == null)
            {
                ErrorCallback(
                    "Couldn't check your login credentials.\nMake sure you start the game through\nthe launcher.");
                yield break;
            }

            string url = $"{Environment.GetEnvironmentVariable("MWGG_ACCOUNTS_URL")!}/api/v2/auth/check";
            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage($"Authenticating with account server @ POST {url}");

            UnityWebRequest checkAuthRequest = UnityWebRequest.Post(url, "");
            checkAuthRequest.SetRequestHeader("Authorization", $"Bearer {userCredentials.ClientToken}");

            yield return checkAuthRequest.SendWebRequest();
            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage($"Authentication status: {checkAuthRequest.result}..");
            
            if (checkAuthRequest.result != UnityWebRequest.Result.Success)
            {
                ErrorCallback(
                    "Failed to get information about your login.\nMake sure you start the game through\nthe launcher.");
                yield break;
            }

            string checkAuthResponseText = checkAuthRequest.downloadHandler.text;
            StandardApiResponse<UserInformationWithAuthToken>? userInformation =
                JsonSerializer.Deserialize<StandardApiResponse<UserInformationWithAuthToken>>(checkAuthResponseText);
            if (userInformation == null)
            {
                ErrorCallback(
                    "Couldn't get information about your login.\nMake sure you start the game through\nthe launcher.");
                yield break;
            }
            
            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage($"Successfully authenticated!");

            _cachedUserInformation = userInformation.Data;
            DoneCallback();
        }

        public static bool IsLoggedIn()
        {
            return _cachedUserInformation != null;
        }

        public static UserInformationWithAuthToken GetLoginInformation()
        {
            return _cachedUserInformation!;
        }
    }
}