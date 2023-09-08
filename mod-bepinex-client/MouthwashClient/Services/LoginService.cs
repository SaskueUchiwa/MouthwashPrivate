using System;
using System.IO;
using System.Net.Http;
using System.Text.Json;
using System.Text.Json.Serialization;
using Reactor.Utilities;

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
        static private UserInformationWithAuthToken? _cachedUserInformation;
        
        public static async void Initialize()
        {
            _cachedUserInformation = null;
            
            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage($"Checking user credentials..");
            
            LoginUserCredentials? userCredentials = CredentialsService.GetLoginUserCredentials();
            if (userCredentials == null)
            {
                // DisconnectPopup.Instance.SetText("Couldn't check your login credentials. Make sure you start the game through the launcher.");
                // DisconnectPopup.Instance.Show();
                return;
            }
            
            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage($"Authenticating with account server.. {userCredentials}");

            HttpClient checkAuthHttpClient = new();
            HttpRequestMessage checkAuthRequest = new();
            checkAuthRequest.RequestUri =
                new Uri($"{Environment.GetEnvironmentVariable("MWGG_ACCOUNTS_URL")!}/api/v2/auth/check");
            checkAuthRequest.Method = HttpMethod.Post;
            checkAuthRequest.Headers.Add("Authorization", $"Bearer {userCredentials.ClientToken}");

            HttpResponseMessage checkAuthResponse = checkAuthHttpClient.Send(checkAuthRequest);

            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage($"Authentication status: {checkAuthResponse.StatusCode}..");
            
            if (!checkAuthResponse.IsSuccessStatusCode)
            {
                // DisconnectPopup.Instance.SetText("Couldn't get information about your login. Make sure you start the game through the launcher.");
                // DisconnectPopup.Instance.Show();
                return;
            }

            string checkAuthResponseText = await checkAuthResponse.Content.ReadAsStringAsync();
            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage(checkAuthResponseText);
            StandardApiResponse<UserInformationWithAuthToken>? userInformation =
                JsonSerializer.Deserialize<StandardApiResponse<UserInformationWithAuthToken>>(checkAuthResponseText);
            if (userInformation == null)
            {
                // DisconnectPopup.Instance.SetText("Couldn't get information about your login. Make sure you start the game through the launcher.");
                // DisconnectPopup.Instance.Show();
                return;
            }
            
            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage($"Successfully authenticated!");

            _cachedUserInformation = userInformation.Data;
            Reactor.Patches.ReactorVersionShower.UpdateText();
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