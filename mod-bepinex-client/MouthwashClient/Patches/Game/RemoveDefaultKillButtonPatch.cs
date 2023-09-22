using HarmonyLib;

namespace MouthwashClient.Patches.Game
{
    [HarmonyPatch(typeof(ActionButton), nameof(ActionButton.ToggleVisible))]
    public static class RemoveDefaultKillButtonPatch
    {
        public static bool Prefix(ActionButton __instance)
        {
            __instance.Hide();
            return false;
        }
    }
}