﻿using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using HarmonyLib;
using Hazel;
using Il2CppSystem.Security.Cryptography;
using MouthwashClient.Enums;
using Reactor.Utilities;
using Reactor.Utilities.Extensions;
using UnityEngine;

namespace MouthwashClient.Services
{
    public enum ResourceType
    {
        AssetBundle
    }
    
    public class ResourceFetchState
    {
        public int ResourceId;
        public bool IsCompleted;
    }

    [Serializable]
    public class CosmeticBundleManifest
    {
        [JsonPropertyName("References")]
        public Dictionary<string, string> References;
    }
    
    public static class RemoteResourceService
    {
        public static Dictionary<int, ResourceFetchState> ExistingResourceFetchStates = new();
        public static Dictionary<int, AssetBundle> LoadedAssetBundles = new();

        public static Dictionary<string, ScriptableObject> MockViewDataAddressable = new();
        public static Dictionary<string, CosmeticData> LoadedCosmetics = new();

        public static string GetResourceCacheFile(int resourceId, ResourceType resourceType)
        {
            string exePath = System.Reflection.Assembly.GetExecutingAssembly().Location;
            string exeDirectory = System.IO.Path.GetDirectoryName(exePath);

            string cacheDirectory = System.IO.Path.Join(exeDirectory, "Cache");
            return System.IO.Path.Join(cacheDirectory, resourceId + (resourceType == ResourceType.AssetBundle ? ".bundle" : ""));
        }

        public static bool TryLoadResourceFromCache(int resourceId, out byte[] contents, ResourceType resourceType)
        {
            string cacheFile = GetResourceCacheFile(resourceId, resourceType);
            if (System.IO.File.Exists(cacheFile))
            {
                contents = System.IO.File.ReadAllBytes(cacheFile);
                return true;
            }

            contents = new byte[] { };
            return false;
        }

        public static void AddResourceToCache(int resourceId, byte[] contents, ResourceType resourceType)
        {
            string cacheFile = GetResourceCacheFile(resourceId, resourceType);
            System.IO.Directory.CreateDirectory(System.IO.Path.GetDirectoryName(cacheFile));
            System.IO.File.WriteAllBytes(cacheFile, contents);
        }

        public static bool LoadAssetBundle(int resourceId, byte[] contents)
        {
            if (LoadedAssetBundles.ContainsKey(resourceId))
                return true;
            
            AssetBundle bundle = AssetBundle.LoadFromMemory(contents);

            if (bundle == null)
                return false;
            
            LoadedAssetBundles.TryAdd(resourceId, bundle);
            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogWarning(
                $"Asset names: {string.Join(", ", bundle.AllAssetNames())}");
            TextAsset? manifestText =
                bundle.LoadAsset<TextAsset>(bundle.AllAssetNames()
                    .FirstOrDefault(x => x.Contains("manifest.json"), ""));
            if (manifestText != null)
            {
                PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage(manifestText.text);
                CosmeticBundleManifest? manifest = Utf8Json.JsonSerializer.Deserialize<CosmeticBundleManifest>(manifestText.text);
                if (manifest != null)
                {
                    PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogWarning(
                        $"Manifest: {manifest}");
                    PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogWarning(
                        $"Manifest.References: {manifest.References}");
                    foreach (KeyValuePair<string, string> entry in manifest.References)
                    {
                        PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogWarning(
                            $"{entry.Key} = {entry.Value}");
                        CosmeticData? bundleCosmeticData = bundle.LoadAsset<CosmeticData>(entry.Key);
                        ScriptableObject? bundleCosmeticViewData = bundle.LoadAsset<ScriptableObject>(entry.Value);

                        if (bundleCosmeticData == null)
                        {
                            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogWarning(
                                $"Cosmetic data at {entry.Key} was null");
                            continue;
                        }
                        
                        if (bundleCosmeticViewData == null)
                        {
                            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogWarning(
                                $"Cosmetic data at {entry.Value} was null");
                            continue;
                        }

                        MockViewDataAddressable.TryAdd(bundleCosmeticData.ProductId, bundleCosmeticViewData);
                        LoadedCosmetics.TryAdd(bundleCosmeticData.ProductId, bundleCosmeticData);
                        HatData? hatData = bundleCosmeticData.TryCast<HatData>();
                        PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogWarning(
                            $"Adding {bundleCosmeticData.ProductId} as a hat.. {hatData}");
                        if (hatData != null)
                        {
                            hatData.Free = true;
                            DestroyableSingleton<HatManager>.Instance.allHats = DestroyableSingleton<HatManager>.Instance.allHats.AddItem(hatData).ToArray();
                        }
                    }
                }
            }

            return true;
        }

        public static bool LoadResource(int resourceId, byte[] contents, ResourceType resourceType)
        {
            if (resourceType == ResourceType.AssetBundle) return LoadAssetBundle(resourceId, contents);
            return false;
        }
        
        public static IEnumerator CoFetchResourceAtLocationAndVerify(int resourceId, string location, byte[] hash, ResourceType resourceType)
        {
            if (TryLoadResourceFromCache(resourceId, out byte[] contents, resourceType))
            {
                PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogInfo(
                    $"Resource of ID {resourceId} was retrieved from cache successfully.");
                if (!LoadResource(resourceId, contents, resourceType))
                {
                    PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogError(
                        $"Failed to load resource of ID {resourceId} ({resourceType})");
                }
                SendFetchResourceEnded(resourceId, true);
                yield break;
            }

            if (ExistingResourceFetchStates.TryGetValue(resourceId, out ResourceFetchState existingFetchState))
            {
                while (!existingFetchState.IsCompleted)
                    yield return null;
                yield break;
            }

            ResourceFetchState fetchState = new()
            {
                IsCompleted = false,
                ResourceId = resourceId
            };
            ExistingResourceFetchStates.TryAdd(resourceId, fetchState);
            
            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage(
                $"Requesting hash for resource of ID {resourceId} at {location}.sha256..");
            HttpRequestMessage getHashRequest = new()
            {
                Method = HttpMethod.Get,
                RequestUri = new Uri(location + ".sha256")
            };
            Task<HttpResponseMessage> getHashResponse = PluginSingleton<MouthwashClientPlugin>.Instance.httpClient.SendAsync(getHashRequest, HttpCompletionOption.ResponseHeadersRead);
            if (!getHashResponse.IsCompleted)
                yield return null;
            if (!getHashResponse.Result.IsSuccessStatusCode)
            {
                SendFetchResourceFailed(resourceId, (int)getHashResponse.Result.StatusCode);
                fetchState.IsCompleted = true;
                yield break;
            }
            Task<string> getHashResponseContent = getHashResponse.Result.Content.ReadAsStringAsync();
            while (!getHashResponseContent.IsCompleted)
                yield return null;

            byte[] hashResponse = Convert.FromHexString(getHashResponseContent.Result);

            if (hash.SequenceEqual(hashResponse))
            {
                PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogInfo(
                    $"Got correct hash '{Convert.ToHexString(hashResponse)}' for resource of ID {resourceId}");
            }
            else
            {
                PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogError(
                    $"Got wrong hash '{Convert.ToHexString(hashResponse)}' vs '{Convert.ToHexString(hash)}' for resource of ID {resourceId}");
                SendFetchResourceFailed(resourceId, FetchFailedReasons.InvalidHash);
                fetchState.IsCompleted = true;
                yield break;
            }
            
            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage(
                $"Requesting content for resource of ID {resourceId} at {location}..");

            HttpRequestMessage getContentsRequest = new()
            {
                Method = HttpMethod.Get,
                RequestUri = new Uri(location)
            };
            Task<HttpResponseMessage> getContentsResponse = PluginSingleton<MouthwashClientPlugin>.Instance.httpClient.SendAsync(getContentsRequest, HttpCompletionOption.ResponseHeadersRead);
            if (!getContentsResponse.IsCompleted)
                yield return null;
            if (!getContentsResponse.Result.IsSuccessStatusCode)
            {
                SendFetchResourceFailed(resourceId, (int)getContentsResponse.Result.StatusCode);
                fetchState.IsCompleted = true;
                yield break;
            }
            SendFetchResourceStarted(resourceId, int.Parse(getContentsResponse.Result.Content.Headers.GetValues("Content-Length").First()));
            Task<byte[]> getContentsResponseContent = getContentsResponse.Result.Content.ReadAsByteArrayAsync();
            while (!getContentsResponseContent.IsCompleted)
                yield return null;
            
            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage(
                $"Got content of size {getContentsResponseContent.Result.Length} bytes for resource of ID {resourceId}");

            SHA256Managed managedSha256 = new();
            byte[] actualContentHash = managedSha256.ComputeHash(getContentsResponseContent.Result);
            if (!actualContentHash.SequenceEqual(hashResponse))
            {
                PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogError(
                    $"Got content with wrong hash '{Convert.ToHexString(actualContentHash)}' vs '{Convert.ToHexString(hashResponse)}' for resource of ID {resourceId}");
                SendFetchResourceFailed(resourceId, FetchFailedReasons.IncorrectHash);
                fetchState.IsCompleted = true;
                yield break;
            }
            
            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogInfo(
                $"Successfully fetched resource of ID {resourceId} ({Convert.ToHexString(actualContentHash)})");
            fetchState.IsCompleted = true;
            SendFetchResourceEnded(resourceId, false);
            if (!LoadResource(resourceId, getContentsResponseContent.Result, resourceType))
            {
                PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogError(
                    $"Failed to load resource of ID {resourceId} ({resourceType})");
            }
            LoadResource(resourceId, getContentsResponseContent.Result, resourceType);
        }
        
        public static class FetchFailedReasons {
            public static int InvalidHash = 900;
            public static int IncorrectHash = 901;
        }

        public enum ResponseType
        {
            Started,
            Ended,
            Failed,
            Invalid
        }

        public static void SendFetchResourceStarted(int resourceId, int contentSize)
        {
            MessageWriter writer = MessageWriter.Get(SendOption.Reliable);
            writer.StartMessage((int)MouthwashRootPacketTag.FetchResource);
            writer.WritePacked(resourceId);
            writer.Write((byte)ResponseType.Started);
            writer.WritePacked(contentSize);
            writer.EndMessage();
            DestroyableSingleton<AmongUsClient>.Instance.SendOrDisconnect(writer);
            writer.Recycle();
        }
        
        public static void SendFetchResourceEnded(int resourceId, bool didCache)
        {
            MessageWriter writer = MessageWriter.Get(SendOption.Reliable);
            writer.StartMessage((int)MouthwashRootPacketTag.FetchResource);
            writer.WritePacked(resourceId);
            writer.Write((byte)ResponseType.Ended);
            writer.Write(didCache);
            writer.EndMessage();
            DestroyableSingleton<AmongUsClient>.Instance.SendOrDisconnect(writer);
            writer.Recycle();
        }

        public static void SendFetchResourceFailed(int resourceId, int reason)
        {
            MessageWriter writer = MessageWriter.Get(SendOption.Reliable);
            writer.StartMessage((int)MouthwashRootPacketTag.FetchResource);
            writer.WritePacked(resourceId);
            writer.Write((byte)ResponseType.Failed);
            writer.WritePacked(reason);
            writer.EndMessage();
            DestroyableSingleton<AmongUsClient>.Instance.SendOrDisconnect(writer);
            writer.Recycle();
        }

        public static void SendFetchResourceInvalid(int resourceId)
        {
            MessageWriter writer = MessageWriter.Get(SendOption.Reliable);
            writer.StartMessage((int)MouthwashRootPacketTag.FetchResource);
            writer.WritePacked(resourceId);
            writer.Write((byte)ResponseType.Invalid);
            writer.EndMessage();
            DestroyableSingleton<AmongUsClient>.Instance.SendOrDisconnect(writer);
            writer.Recycle();
        }
    }
}