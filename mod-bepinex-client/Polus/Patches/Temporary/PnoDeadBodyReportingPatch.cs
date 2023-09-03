using HarmonyLib;
using Hazel;
using Polus.Behaviours.Inner;
using Polus.Enums;
using Polus.Extensions;
using UnityEngine;

namespace Polus.Patches.Temporary {
    [HarmonyPatch(typeof(DeadBody), nameof(DeadBody.OnClick))]
    public class PnoDeadBodyReportingPatch {
        [HarmonyPrefix]
        public static bool OnClock(DeadBody __instance) {
            if (__instance.Reported)
                return false;
            // MessageWriter messageWriter = AmongUsClient.Instance.StartRpc(PlayerControl.LocalPlayer.NetId, (byte)PolusRpcCalls.ReportDeadBody);
            // messageWriter.Write(__instance.GetComponent<PolusDeadBody>().pno.NetId);
            // messageWriter.EndMessage();
            if (PlayerControl.LocalPlayer.Data.IsDead)
                return false;
            
            __instance.GetComponent<PolusDeadBody>().OnReported(PlayerControl.LocalPlayer.NetId);
            return false;
        }
    }
    
    [HarmonyPatch(typeof(PlayerControl), nameof(PlayerControl.ReportClosest))]
    public class PnoDeadBodyReportClosestPatch
    {
        [HarmonyPrefix]
        public static bool ReportClosest(PlayerControl __instance)
        {
            if (AmongUsClient.Instance.IsGameOver)
            {
                return false;
            }
            if (PlayerControl.LocalPlayer.Data.IsDead)
            {
                return false;
            }
            foreach (Collider2D collider2D in Physics2D.OverlapCircleAll(__instance.GetTruePosition(), __instance.MaxReportDistance, Constants.Usables))
            {
                DeadBody component = collider2D.GetComponent<DeadBody>();
                $"DeadBody Component: {component}".Log();
                if (component)
                {
                    $"Reported: {component.Reported}".Log();
                }
                if (component && !component.Reported)
                {
                    component.OnClick();
                    if (component.Reported)
                    {
                        break;
                    }
                }
            }

            return false;
        }
    }
}