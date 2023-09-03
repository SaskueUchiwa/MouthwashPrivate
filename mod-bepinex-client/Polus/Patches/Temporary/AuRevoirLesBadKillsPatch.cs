using System.Collections;
using System.Linq;
using HarmonyLib;
using Il2CppSystem;
using Il2CppSystem.Collections.Generic;
using Polus.Extensions;
using PowerTools;
using UnhollowerBaseLib;
using UnityEngine;

namespace Polus.Patches.Temporary {
    [HarmonyPatch(typeof(PlayerControl), nameof(PlayerControl.MurderPlayer))]
    public class AuRevoirLesBadKillsPatch {
        [HarmonyPatch(typeof(PlayerControl), nameof(PlayerControl.MurderPlayer))]
        public static class MurderPlayerPatch
        {
            [HarmonyPrefix]
            public static bool MurderPlayer(PlayerControl __instance, PlayerControl target)
            {
				if (!target || __instance.Data.IsDead || !__instance.Data.IsImpostor || __instance.Data.Disconnected)
				{
					int num = target ? ((int)target.PlayerId) : -1;
					Debug.LogWarning(string.Format("Bad kill from {0} to {1}", __instance.PlayerId, num));
					return false;
				}
				GameData.PlayerInfo data = target.Data;
				if (data == null || data.IsDead)
				{
					Debug.LogWarning("Missing target data for kill");
					return false;
				}
				if (__instance.AmOwner)
				{
					StatsManager instance = StatsManager.Instance;
					uint num2 = instance.ImpostorKills;
					instance.ImpostorKills = num2 + 1U;
					if (Constants.ShouldPlaySfx())
					{
						SoundManager.Instance.PlaySound(__instance.KillSfx, false, 0.8f);
					}
					__instance.SetKillTimer(PlayerControl.GameOptions.KillCooldown);
				}
				if (target.AmOwner)
				{
					StatsManager instance2 = StatsManager.Instance;
					uint num2 = instance2.TimesMurdered;
					instance2.TimesMurdered = num2 + 1U;
					if (Minigame.Instance)
					{
						try
						{
							Minigame.Instance.Close();
							Minigame.Instance.Close();
						}
						catch
						{
						}
					}
					DestroyableSingleton<HudManager>.Instance.KillOverlay.ShowKillAnimation(__instance.Data, data);
					// DestroyableSingleton<HudManager>.Instance.ShadowQuad.gameObject.SetActive(false);
					target.nameText.GetComponent<MeshRenderer>().material.SetInt("_Mask", 0);
					target.RpcSetScanner(false);
					ImportantTextTask importantTextTask = new GameObject("_Player").AddComponent<ImportantTextTask>();
					importantTextTask.transform.SetParent(__instance.transform, false);
					if (!PlayerControl.GameOptions.GhostsDoTasks)
					{
						target.ClearTasks();
						importantTextTask.Text = DestroyableSingleton<TranslationController>.Instance.GetString(StringNames.GhostIgnoreTasks, new Il2CppReferenceArray<Il2CppSystem.Object>(Array.Empty<Il2CppSystem.Object>()));
					}
					else
					{
						importantTextTask.Text = DestroyableSingleton<TranslationController>.Instance.GetString(StringNames.GhostDoTasks,  new Il2CppReferenceArray<Il2CppSystem.Object>(Array.Empty<Il2CppSystem.Object>()));
					}
					target.myTasks.Insert(0, importantTextTask);
				}

				KillAnimation anim = __instance.KillAnimations[UnityEngine.Random.Range(0, __instance.KillAnimations.Count)];
				DestroyableSingleton<AchievementManager>.Instance.OnMurder(__instance.AmOwner, target.AmOwner);
				__instance.MyPhysics.StartCoroutine(DontSpawnDeadBody.CoPerformKillMoveNext(anim, __instance, target));
				return false;
            }
        }
        
        public class DontSpawnDeadBody
        {
	        public static IEnumerator CoPerformKillMoveNext(KillAnimation __instance, PlayerControl source, PlayerControl target)
	        {
		        FollowerCamera cam = Camera.main.GetComponent<FollowerCamera>();
		        bool isParticipant = PlayerControl.LocalPlayer == source || PlayerControl.LocalPlayer == target;
		        PlayerPhysics sourcePhys = source.MyPhysics;
		        KillAnimation.SetMovement(source, false);
		        KillAnimation.SetMovement(target, false);
		        Vector3 vector = target.transform.position + __instance.BodyOffset;
		        vector.z = vector.y / 1000f;
		        if (isParticipant)
		        {
			        cam.Locked = true;
			        ConsoleJoystick.SetMode_Task();
			        if (PlayerControl.LocalPlayer.AmOwner)
			        {
				        PlayerControl.LocalPlayer.MyPhysics.inputHandler.enabled = true;
			        }
		        }
		        SpriteAnim sourceAnim = source.MyAnim;
		        yield return new WaitForAnimationFinish(sourceAnim, __instance.BlurAnim);
		        source.NetTransform.SnapTo(target.transform.position);
		        sourceAnim.Play(sourcePhys.IdleAnim, 1f);
		        KillAnimation.SetMovement(source, true);
		        KillAnimation.SetMovement(target, true);
		        if (isParticipant)
		        {
			        cam.Locked = false;
		        }
	        }
        }
        
        [HarmonyPrefix]
        public static void SetImpostor(PlayerControl __instance, ref bool __state) {
            __state = !__instance.Data.IsImpostor;
            if (__state) __instance.Data.IsImpostor = true;
        }

        [HarmonyPostfix]
        public static void UnsetImpostor(PlayerControl __instance, ref bool __state) {
            if (__state) __instance.Data.IsImpostor = false;
        }
    }
}