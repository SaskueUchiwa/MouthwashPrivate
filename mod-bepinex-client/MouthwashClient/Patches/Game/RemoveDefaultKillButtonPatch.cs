using HarmonyLib;

namespace MouthwashClient.Patches.Game
{
    [HarmonyPatch(typeof(ActionButton), nameof(ActionButton.ToggleVisible))]
    public static class RemoveDefaultKillButtonPatch
    {
        public static bool Prefix(ActionButton __instance)
        {
            if (__instance == DestroyableSingleton<HudManager>.Instance.KillButton)
            {
                __instance.Hide();
                return false;
            }
            return true;
        }
    }
}