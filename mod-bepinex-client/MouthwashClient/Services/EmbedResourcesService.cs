using System.Collections;
using System.IO;
using System.Reflection;
using System.Threading.Tasks;
using Reactor.Utilities;
using UnityEngine;

namespace MouthwashClient.Services
{
    public static class EmbedResourcesService
    {
        public static AssetBundle? LoadedAssetBundle;

        public static async Task CoLoadEmbeddedResources()
        {
            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage("Loading resources 1..");
            if (LoadedAssetBundle != null)
                return;

            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage("Loading resources 2..");
            Stream? embeddedResourceStream = Assembly.GetExecutingAssembly().GetManifestResourceStream("MouthwashClient.mouthwashresources");
            if (embeddedResourceStream == null)
                return;
            
            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage("Loading resources 3..");
            byte[] embeddedResourceBuffer = new byte[embeddedResourceStream.Length];
            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage("Loading resources 4..");
            await embeddedResourceStream.ReadAsync(embeddedResourceBuffer, 0, embeddedResourceBuffer.Length);
            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage("Loading resources 5..");
            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage($"Loading resources 5 {embeddedResourceBuffer.Length}..");
            LoadedAssetBundle = AssetBundle.LoadFromMemory(embeddedResourceBuffer);
            PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage("Loaded!");
        }
    }
}