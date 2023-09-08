using System.Threading.Tasks;
using HarmonyLib;
using MouthwashClient.Services;

namespace MouthwashClient.Patches
{
    [HarmonyPatch(typeof(AmongUsClient), nameof(AmongUsClient.Awake))]
    public static class LoadInformationPatch
    {
        public static void Postfix(AmongUsClient __instance)
        {
            Task.Run(LoginService.Initialize);
        }
    }
}