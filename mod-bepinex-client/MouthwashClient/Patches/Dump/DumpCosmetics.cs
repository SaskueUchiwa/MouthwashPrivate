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

    public struct HatAssetFileReference
    {
        public string file;
        public HatAssetInfoVec2 pivot;
    }

    [Serializable]
    public struct HatAssetInfo
    {
        public string type;
        public HatAssetInfoVec2 chip_offset;
        public string product_id;
        public HatAssetFileReference? main;
        public HatAssetFileReference? back;
        public HatAssetFileReference? left_main;
        public HatAssetFileReference? left_back;
        public HatAssetFileReference? climb;
        public HatAssetFileReference? floor;
        public HatAssetFileReference? left_climb;
        public HatAssetFileReference? left_floor;
        public HatAssetFileReference? thumb;
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
            ConfigEntry<bool> dumpsEnabledConfig = PluginSingleton<MouthwashClientPlugin>.Instance.Config.Bind(
                "Dumps",
                "Enabled",
                false,
                "Whether or not to dump assets from the game");

            ConfigEntry<string> destinationPathConfig = PluginSingleton<MouthwashClientPlugin>.Instance.Config.Bind(
                "Dumps",
                "DestinationPath",
                "",
                "The path to dump assets to");
            
            ConfigEntry<string> originPathConfig = PluginSingleton<MouthwashClientPlugin>.Instance.Config.Bind(
                "Dumps",
                "OriginPath",
                "",
                "The path to read sprites from, exported with AssetStudio");
            
            if (!dumpsEnabledConfig.Value)
            {
                PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage("Dumps are disabled..");
                return;
            }

            BaseDestinationPath = destinationPathConfig.Value;
            BaseOriginPath = originPathConfig.Value;

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
                main = hatViewData.MainImage == null ? null : new HatAssetFileReference{ file = "main.png", pivot = { x = hatViewData.MainImage.pivot.x, y = hatViewData.MainImage.pivot.y } },
                back = hatViewData.BackImage == null ? null : new HatAssetFileReference{ file = "back.png", pivot = { x = hatViewData.BackImage.pivot.x, y = hatViewData.BackImage.pivot.y } },
                left_main = hatViewData.LeftMainImage == null ? null : new HatAssetFileReference{ file = "left_main.png", pivot = { x = hatViewData.LeftMainImage.pivot.x, y = hatViewData.LeftMainImage.pivot.y } },
                left_back = hatViewData.LeftBackImage == null ? null : new HatAssetFileReference{ file = "left_back.png", pivot = { x = hatViewData.LeftBackImage.pivot.x, y = hatViewData.LeftBackImage.pivot.y } },
                floor = hatViewData.FloorImage == null ? null : new HatAssetFileReference{ file = "floor.png", pivot = { x = hatViewData.FloorImage.pivot.x, y = hatViewData.FloorImage.pivot.y } },
                climb = hatViewData.ClimbImage == null ? null : new HatAssetFileReference{ file = "climb.png", pivot = { x = hatViewData.ClimbImage.pivot.x, y = hatViewData.ClimbImage.pivot.y } },
                left_floor = hatViewData.LeftFloorImage == null ? null : new HatAssetFileReference{ file = "left_floor.png", pivot = { x = hatViewData.LeftFloorImage.pivot.x, y = hatViewData.LeftFloorImage.pivot.y } },
                left_climb = hatViewData.LeftClimbImage == null ? null : new HatAssetFileReference{ file = "left_climb.png", pivot = { x = hatViewData.LeftClimbImage.pivot.x, y = hatViewData.LeftClimbImage.pivot.y } },
                thumb = hatViewData.MainImage == null ? null : new HatAssetFileReference{ file = "thumb.png", pivot = { x = hatViewData.MainImage.pivot.x, y = hatViewData.MainImage.pivot.y } }
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