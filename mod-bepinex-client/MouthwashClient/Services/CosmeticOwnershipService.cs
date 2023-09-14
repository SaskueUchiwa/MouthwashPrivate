using System;
using System.Collections;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Reactor.Utilities;

namespace MouthwashClient.Services
{
    public struct OwnedBundleItem
    {
        [JsonPropertyName("id")]
        public string Id { get; set; }
        [JsonPropertyName("bundle_id")]
        public string BundleId { get; set; }
        [JsonPropertyName("name")]
        public string Name { get; set; }
        [JsonPropertyName("among_us_id")]
        public string AmongUsId { get; set; }
        [JsonPropertyName("resource_path")]
        public string ResourcePath { get; set; }
        [JsonPropertyName("type")]
        public string Type { get; set; }
        [JsonPropertyName("resource_id")]
        public int ResourceId { get; set; }
    }
    
    public static class CosmeticOwnershipService
    {
        public static HashSet<string> OwnedItemIds = new();

        public static IEnumerator CoLoadOwnedCosmetics()
        {
            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage($"Loading cosmetics owned by user..");
            string url = $"{Environment.GetEnvironmentVariable("MWGG_ACCOUNTS_URL")!}/api/v2/accounts/owned_bundles";
            HttpRequestMessage ownedBundlesRequest = new()
            {
                Method = HttpMethod.Get,
                Headers =
                {
                    Authorization =
                        new AuthenticationHeaderValue("Bearer", LoginService.GetLoginInformation().ClientToken)
                },
                RequestUri = new Uri(url)
            };
            Task<HttpResponseMessage> ownedBundlesResponse =
                PluginSingleton<MouthwashClientPlugin>.Instance.httpClient.SendAsync(ownedBundlesRequest);
            while (!ownedBundlesResponse.IsCompleted)
                yield return null;
            Task<string> ownedBundlesResponseContent = ownedBundlesResponse.Result.Content.ReadAsStringAsync();
            while (!ownedBundlesResponseContent.IsCompleted)
                yield return null;
            OwnedBundleItem[]? ownedBundleItems = JsonSerializer.Deserialize<StandardApiResponse<OwnedBundleItem[]>>(ownedBundlesResponseContent.Result)?.Data;
            if (ownedBundleItems == null)
            {
                PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogWarning($"Could not parse owned bundles: {ownedBundlesResponseContent.Result}");
                yield break;
            }
            
            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage($"Got {ownedBundleItems.Length} cosmetics owned by user");

            foreach (OwnedBundleItem ownedBundleItem in ownedBundleItems)
            {
                PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage(ownedBundleItem.AmongUsId);
                OwnedItemIds.Add(ownedBundleItem.AmongUsId);
            }
        }
    }
}