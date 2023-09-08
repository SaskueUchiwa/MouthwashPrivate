using HarmonyLib;
using UnityEngine.UI;

namespace MouthwashClient.Patches.Menu
{
    [HarmonyPatch(typeof(MainMenuManager), nameof(MainMenuManager.Start))]
    public class SkipToOnlinePlayPatch
    {
        public static void Postfix(MainMenuManager __instance)
        {
            __instance.playButton.OnClick = __instance.PlayOnlineButton.OnClick;
        }
    }
}