using System.Threading.Tasks;
using AmongUs.Data;
using HarmonyLib;
using MouthwashClient.Services;
using Reactor.Utilities;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace MouthwashClient.Patches
{
    [HarmonyPatch(typeof(MainMenuManager), nameof(MainMenuManager.Start))]
    public static class LoadInformationPatch
    {
        private static bool _onceLogin = false;
        
        public static void Postfix(MainMenuManager __instance)
        {
            if (_onceLogin) return;
            
            LoginService.ErrorCallback += s =>
            {
                PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage($"Showing error: {s}");
                PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage(DestroyableSingleton<DisconnectPopup>.Instance.isActiveAndEnabled);
                DestroyableSingleton<DiscordManager>.Instance.discordPopup.Show($"<size=150%>{s}</size>");
                DestroyableSingleton<EOSManager>.Instance.HideCallbackWaitAnim();
            };
            LoginService.DoneCallback += () =>
            {
                DestroyableSingleton<EOSManager>.Instance.HideCallbackWaitAnim();
                Reactor.Patches.ReactorVersionShower.UpdateText();
            };
            DestroyableSingleton<AmongUsClient>.Instance.StartCoroutine(LoginService.Initialize());
            _onceLogin = true;
        }
    }

    [HarmonyPatch(typeof(EOSManager), nameof(EOSManager.ProductUserId), MethodType.Getter)]
    public static class FalsifyEOSProductUserIdPatch
    {
        public static bool Prefix(EOSManager __instance, ref string __result)
        {
            __result = "";
            return false;
        }
    }

    [HarmonyPatch(typeof(AccountManager), nameof(AccountManager.CanPlayOnline))]
    public static class AllowOnlinePlayPatch
    {
        public static bool Prefix(AccountManager __instance, ref bool __result)
        {
            __result = true;
            return false;
        }
    }

    [HarmonyPatch(typeof(EOSManager), nameof(EOSManager.StartInitialLoginFlow))]
    public static class PreventEOSLoginPatch
    {
        public static bool Prefix(EOSManager __instance)
        {
            SceneManager.LoadScene("MainMenu");
            return false;
        }
    }

    [HarmonyPatch(typeof(EOSManager), nameof(EOSManager.LoginWithCorrectPlatform))]
    public static class PreventEOSLoginPlatformPatch
    {
        public static bool Prefix(EOSManager __instance)
        {
            return false;
        }
    }

    [HarmonyPatch(typeof(EOSManager), nameof(EOSManager.HasFinishedLoginFlow))]
    public static class AssumeEOSLoggedInPatch
    {
        public static bool Prefix(EOSManager __instance, ref bool __result)
        {
            __result = true;
            return false;
        }
    }
}