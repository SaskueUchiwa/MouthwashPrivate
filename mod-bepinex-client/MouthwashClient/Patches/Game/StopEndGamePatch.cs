using HarmonyLib;

namespace MouthwashClient.Patches.Game
{
    [HarmonyPatch(typeof(LogicGameFlowNormal), nameof(LogicGameFlowNormal.IsGameOverDueToDeath))]
    public class StopEndGamePatch
    {
        public static bool Prefix(LogicGameFlowNormal __instance, ref bool __result)
        {
            __result = false;
            return false;
        }
    }
}