using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using BepInEx.Configuration;
using HarmonyLib;
using Innersloth.Assets;
using Reactor.Utilities;
using UnityEngine;

namespace MouthwashClient.Patches.Dump
{
    [Serializable]
    public struct HatAssetInfoVec2
    {
        public float x;
        public float y;
    }

    [Serializable]
    public struct HatAssetInfo
    {
        public string type;
        public HatAssetInfoVec2 chip_offset;
        public string product_id;
        public string? main;
        public string? back;
        public string? left_main;
        public string? left_back;
        public string? climb;
        public string? floor;
        public string? left_climb;
        public string? left_floor;
        public string? thumb;
    }

    [Serializable]
    public struct BundleMetadataInfo
    {
        public HatAssetInfo[] assets;
    }
    
    [HarmonyPatch(typeof(HatManager), nameof(HatManager.Initialize))]
    public static class DumpCosmetics
    {
        public static string BaseDestinationPath = "";
        public static string BaseOriginPath = "";

        public static int NumHatsLoaded;
        public static List<HatAssetInfo> HatAssets = new();
        
        public static void Postfix(HatManager __instance)
        {
            bool dumpsEnabledFound = PluginSingleton<MouthwashClientPlugin>.Instance.Config.TryGetEntry("Dumps", "Enabled",
                out ConfigEntry<bool> enabledDumpsConfig);
            if (!dumpsEnabledFound || !enabledDumpsConfig.Value)
                return;

            if (PluginSingleton<MouthwashClientPlugin>.Instance.Config.TryGetEntry("Dumps", "DestinationPath",
                    out ConfigEntry<string> destinationPathConfig))
            {
                BaseDestinationPath = destinationPathConfig.Value;
            }
            
            if (PluginSingleton<MouthwashClientPlugin>.Instance.Config.TryGetEntry("Dumps", "OriginPath",
                    out ConfigEntry<string> originPathConfig))
            {
                BaseOriginPath = originPathConfig.Value;
            }

            int numHatsReceived = 0;
            NumHatsLoaded = 0;
            HatAssets.Clear();
            foreach (HatData hatData in __instance.allHats)
            {
                if (!hatData.Free)
                    continue;
                Directory.CreateDirectory(Path.Combine(BaseDestinationPath, numHatsReceived.ToString()));
                AddressableAsset<HatViewData> hatViewDataAddr = hatData.CreateAddressableAsset();
                __instance.StartCoroutine(CoLoadHatViewData(numHatsReceived, hatData, hatViewDataAddr));
                numHatsReceived++;
            }

            __instance.StartCoroutine(WaitForAllLoaded(numHatsReceived));
        }

        public static IEnumerator WaitForAllLoaded(int numReceived)
        {
            while (numReceived != NumHatsLoaded)
                yield return null;
            File.WriteAllBytes(Path.Combine(BaseDestinationPath, "metadata.json"), Utf8Json.JsonSerializer.Serialize(new BundleMetadataInfo
            {
                assets = HatAssets.ToArray()
            }));
        }

        public static IEnumerator CoLoadHatViewData(int hatId, HatData hatData, AddressableAsset<HatViewData> hatViewDataAddr)
        {
            yield return hatViewDataAddr.CoLoadAsync();
            HatViewData hatViewData = hatViewDataAddr.GetAsset();
            WritePngForSprite(hatId, "main.png", hatViewData.MainImage);
            WritePngForSprite(hatId, "back.png", hatViewData.BackImage);
            WritePngForSprite(hatId, "left_main.png", hatViewData.LeftMainImage);
            WritePngForSprite(hatId, "left_back.png", hatViewData.LeftBackImage);
            WritePngForSprite(hatId, "floor.png", hatViewData.FloorImage);
            WritePngForSprite(hatId, "climb.png", hatViewData.ClimbImage);
            WritePngForSprite(hatId, "left_floor.png", hatViewData.LeftFloorImage);
            WritePngForSprite(hatId, "left_climb.png", hatViewData.LeftClimbImage);
            WritePngForSprite(hatId, "thumb.png", hatViewData.MainImage);
            NumHatsLoaded++;
            HatAssets.Add(new HatAssetInfo
            {
                type = "HAT",
                product_id = hatData.ProductId,
                chip_offset = new HatAssetInfoVec2{ x = hatData.ChipOffset.x, y = hatData.ChipOffset.y },
                main = hatViewData.MainImage == null ? null : "main.png",
                back = hatViewData.BackImage == null ? null : "back.png",
                left_main = hatViewData.LeftMainImage == null ? null : "left_main.png",
                left_back = hatViewData.LeftBackImage == null ? null : "left_back.png",
                floor = hatViewData.FloorImage == null ? null : "floor.png",
                climb = hatViewData.ClimbImage == null ? null : "climb.png",
                left_floor = hatViewData.LeftFloorImage == null ? null : "left_floor.png",
                left_climb = hatViewData.LeftClimbImage == null ? null : "left_climb.png",
                thumb = hatViewData.MainImage == null ? null : "thumb.png"
            });
        }

        public static void WritePngForSprite(int hatId, string spriteName, Sprite? sprite)
        {
            if (sprite == null)
                return;
            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage($"Found {sprite.name}..");
            if (File.Exists(Path.Combine(BaseDestinationPath, hatId.ToString(), spriteName)))
                File.Delete(Path.Combine(BaseDestinationPath, hatId.ToString(), spriteName));
            File.Copy(Path.Combine(BaseOriginPath, sprite.name + ".png"), Path.Combine(BaseDestinationPath, hatId.ToString(), spriteName));
        }
    }
}