using HarmonyLib;
using Il2CppInterop.Runtime.InteropTypes.Arrays;
using ImaginationOverflow.UniversalDeepLinking;
using Reactor.Utilities.Extensions;

namespace MouthwashClient.Patches.OnlinePlay
{
    [HarmonyPatch(typeof(ServerManager), nameof(ServerManager.LoadServers))]
    public static class ReplaceGameServersPatch
    {
        public static bool Prefix(ServerManager __instance)
        {
            DnsRegionInfo globalRegion = new DnsRegionInfo("region.mouthwash.midlight.studio", "Global",
                StringNames.NoTranslation, "135.181.30.41", 22023, false);
            DnsRegionInfo localHostRegion = new DnsRegionInfo("localhost", "Localhost",
                StringNames.NoTranslation, "127.0.0.1", 22023, false);
            __instance.AvailableRegions = new Il2CppReferenceArray<IRegionInfo>(new[]
            {
                globalRegion.TryCast<IRegionInfo>()!,
                localHostRegion.TryCast<IRegionInfo>()!
            });
            __instance.CurrentRegion = __instance.AvailableRegions[0];
            __instance.CurrentUdpServer = __instance.CurrentRegion.Servers.Random();
            __instance.state = UpdateState.Success;
            return false;
        }
    }

    [HarmonyPatch(typeof(ServerManager), nameof(ServerManager.SaveServers))]
    public static class PreventPermanentServersSavingPatch
    {
        public static bool Prefix(ServerManager __instance)
        {
            return false;
        }
    }

    [HarmonyPatch(typeof(DeeplinkHandler), nameof(DeeplinkHandler.Instance_LinkActivated))]
    public static class RemoveDeepLinkPatch
    {
        public static bool Prefix(DeeplinkHandler __instance)
        {
            return false;
        }
    }
}