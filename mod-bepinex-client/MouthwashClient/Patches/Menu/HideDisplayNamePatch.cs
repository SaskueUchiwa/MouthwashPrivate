using HarmonyLib;
using Reactor.Utilities.Extensions;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace MouthwashClient.Patches.Menu
{
    [HarmonyPatch(typeof(AccountManager), nameof(AccountManager.OnSceneLoaded))]
    public static class HideDisplayNamePatch
    {
        public static void Postfix(AccountManager __instance, [HarmonyArgument(0)] Scene scene)
        {
            if (scene.name == "MMOnline")
            {
                GameObject nameTextObject = GameObject.Find("NameText(Clone)");
                nameTextObject.Destroy();
            }
        }
    }
}