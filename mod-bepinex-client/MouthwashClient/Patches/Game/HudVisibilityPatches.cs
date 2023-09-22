using System;
using System.Collections.Generic;
using HarmonyLib;
using Hazel;
using InnerNet;
using MouthwashClient.Enums;
using Object = UnityEngine.Object;

namespace MouthwashClient.Patches.Game
{
    public static class HudVisibilityPatches
    {
        public static HashSet<HudItem> hiddenItems = new();

        [HarmonyPatch(typeof(InnerNetClient), nameof(InnerNetClient.HandleMessage))]
        public static bool Prefix(InnerNetClient __instance,
            [HarmonyArgument(0)] MessageReader reader, [HarmonyArgument(1)] SendOption sendOption)
        {
            switch (reader.Tag)
            {
                case (byte)MouthwashRootPacketTag.SetHudVisibility:
                    HudItem hudItem = (HudItem)reader.ReadByte();
                    bool isVisible = reader.ReadBoolean();
                    if (isVisible) hiddenItems.Remove(hudItem); else hiddenItems.AddItem(hudItem);
                    switch (hudItem)
                    {
                        case HudItem.AdminTable:
                            HudManager.Instance.AdminButton.ToggleVisible(isVisible);
                            MapConsole adminMapConsole = Object.FindObjectOfType<MapConsole>(true);
                            if (adminMapConsole != null)
                            {
                                adminMapConsole.gameObject.SetActive(isVisible);
                            }
                            break;
                        case HudItem.MapButton:
                            HudManager.Instance.ToggleMapButton(isVisible);
                            break;
                        case HudItem.MapSabotageButtons:
                            break;
                        case HudItem.MapDoorButtons:
                            break;
                        case HudItem.SabotageButton:
                            HudManager.Instance.SabotageButton.ToggleVisible(isVisible);
                            break;
                        case HudItem.VentButton:
                            HudManager.Instance.ImpostorVentButton.ToggleVisible(isVisible);
                            break;
                        case HudItem.UseButton:
                            HudManager.Instance.UseButton.ToggleVisible(isVisible);
                            break;
                        case HudItem.TaskProgressBar:
                            ProgressTracker taskProgress = Object.FindObjectOfType<ProgressTracker>(true);
                            if (taskProgress != null)
                            {
                                taskProgress.gameObject.SetActive(isVisible);
                            }
                            break;
                        case HudItem.TaskListPopup:
                            HudManager.Instance.TaskPanel.gameObject.SetActive(isVisible);
                            break;
                        case HudItem.ReportButton:
                            HudManager.Instance.ReportButton.ToggleVisible(isVisible);
                            break;
                        case HudItem.CallMeetingButton:
                            EmergencyMinigame emergencyMinigame = Object.FindObjectOfType<EmergencyMinigame>(true);
                            if (emergencyMinigame != null)
                            {
                                emergencyMinigame.gameObject.SetActive(isVisible);
                            }
                            break;
                        case HudItem.GameCode:
                            DestroyableSingleton<GameStartManager>.Instance.GameRoomNameCode.gameObject.SetActive(isVisible);
                            break;
                        default:
                            throw new ArgumentOutOfRangeException();
                    }
                    break;
            }
            return true;
        }

        [HarmonyPatch(typeof(HudManager), nameof(HudManager.ToggleMapButton))]
        public static class MapButtonVisibilityPatch
        {
            public static bool Prefix(HudManager __instance)
            {
                if (hiddenItems.Contains(HudItem.MapButton))
                {
                    __instance.MapButton.gameObject.SetActive(false);
                    return false;
                }
                return true;
            }
        }

        [HarmonyPatch(typeof(ActionButton), nameof(ActionButton.ToggleVisible))]
        public static class SabotageButtonVisibilityPatch
        {
            public static bool Prefix(ActionButton __instance)
            {
                if (__instance == DestroyableSingleton<HudManager>.Instance.SabotageButton)
                {
                    if (hiddenItems.Contains(HudItem.SabotageButton))
                    {
                        __instance.Hide();
                        return false;
                    }
                } else if (__instance == DestroyableSingleton<HudManager>.Instance.ImpostorVentButton)
                {
                    if (hiddenItems.Contains(HudItem.VentButton))
                    {
                        __instance.Hide();
                        return false;
                    }
                } else if (__instance == DestroyableSingleton<HudManager>.Instance.UseButton)
                {
                    if (hiddenItems.Contains(HudItem.UseButton))
                    {
                        __instance.Hide();
                        return false;
                    }
                } else if (__instance == DestroyableSingleton<HudManager>.Instance.ReportButton)
                {
                    if (hiddenItems.Contains(HudItem.ReportButton))
                    {
                        __instance.Hide();
                        return false;
                    }
                } else if (__instance == DestroyableSingleton<HudManager>.Instance.AdminButton)
                {
                    if (hiddenItems.Contains(HudItem.AdminTable))
                    {
                        __instance.Hide();
                        return false;
                    }
                }
                return true;
            }
        }
    }
}