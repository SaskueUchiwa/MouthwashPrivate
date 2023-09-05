using HarmonyLib;
using UnityEngine;

namespace Polus.Patches.Temporary {
    [HarmonyPatch(typeof(HudManager), nameof(HudManager.Start))]
    public class AllowTaskInteractionResetPatch {
        [HarmonyPostfix]
        public static void Postfix() {
            AllowTaskInteractionPatch.TaskInteractionAllowed = true;
        }
    }
    
    [HarmonyPatch(typeof(Console), nameof(Console.CanUse))]
    public class AllowTaskInteractionPatch {
        public static bool TaskInteractionAllowed = true;
        public static bool ForceTaskInteraction = false;
        [HarmonyPrefix]
        public static bool Prefix(Console __instance, [HarmonyArgument(0)] GameData.PlayerInfo pc,
            [HarmonyArgument(1)] ref bool canUse, [HarmonyArgument(2)] ref bool couldUse, ref float __result) {
            if (TaskInteractionAllowed || __instance.AllowImpostor)
            {
                float num = float.MaxValue;
                PlayerControl @object = pc.Object;
                Vector2 truePosition = @object.GetTruePosition();
                Vector3 position = __instance.transform.position;
                couldUse = ((!pc.IsDead || (PlayerControl.GameOptions.GhostsDoTasks && !__instance.GhostsIgnored)) && @object.CanMove && (__instance.AllowImpostor || !pc.IsImpostor || ForceTaskInteraction) && (!__instance.onlySameRoom || __instance.InRoom(truePosition)) && (!__instance.onlyFromBelow || truePosition.y < position.y) && __instance.FindTask(@object));
                canUse = couldUse;
                if (canUse)
                {
                    num = Vector2.Distance(truePosition, __instance.transform.position);
                    canUse &= (num <= __instance.UsableDistance);
                    if (__instance.checkWalls)
                    {
                        canUse &= !PhysicsHelpers.AnythingBetween(truePosition, position, Constants.ShadowMask, false);
                    }
                }

                __result = num;
                return false;
            }
            couldUse = canUse = false;
            __result = float.MaxValue;
            return false;
        }
    }
}