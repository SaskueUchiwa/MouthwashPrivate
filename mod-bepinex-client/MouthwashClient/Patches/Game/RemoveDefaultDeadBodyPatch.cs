using HarmonyLib;
using Reactor.Utilities;
using UnityEngine;

namespace MouthwashClient.Patches.Game
{
    [HarmonyPatch(typeof(KillAnimation._CoPerformKill_d__2), nameof(KillAnimation._CoPerformKill_d__2.MoveNext))]
    public class RemoveDefaultDeadBody
    {
        public static void Postfix(KillAnimation._CoPerformKill_d__2 __instance, ref bool __result)
        {
            if (!__result)
            {
                DeadBody[] deadBodies = Object.FindObjectsOfType<DeadBody>();
                PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage($"Found {deadBodies.Length} dead bodies in scene");
                foreach (DeadBody deadBody in deadBodies)
                {
                    if (deadBody.ParentId != 255)
                    {
                        PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage($"Destroying {deadBody}");
                        Object.Destroy(deadBody.gameObject);
                    }
                }
            }
        }
    }
}