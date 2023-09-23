﻿using System;
using System.Collections.Generic;
using AmongUs.GameOptions;
using HarmonyLib;
using Hazel;
using InnerNet;
using MouthwashClient.Enums;
using Reactor.Utilities;
using Object = UnityEngine.Object;

namespace MouthwashClient.Patches.Game
{
    public static class HudVisibilityPatches
    {
        public static HashSet<HudItem> hiddenItems = new();

        [HarmonyPatch(typeof(InnerNetClient), nameof(InnerNetClient.HandleMessage))]
        public static class SetHudVisibilityMessageHandlePatch
        {
            public static bool Prefix(InnerNetClient __instance,
                [HarmonyArgument(0)] MessageReader reader, [HarmonyArgument(1)] SendOption sendOption)
            {
                switch (reader.Tag)
                {
                    case (byte)MouthwashRootPacketTag.SetHudVisibility:
                        HudItem hudItem = (HudItem)reader.ReadByte();
                        bool isVisible = reader.ReadBoolean();
                        if (isVisible)
                        {
                            hiddenItems.Remove(hudItem);
                        }
                        else
                        {
                            hiddenItems.AddItem(hudItem);
                        }
                        return false;
                }
                return true;
            }
        }

        [HarmonyPatch(typeof(HudManager), nameof(HudManager.Start))]
        public static class RefreshHudOnStartPatch
        {
            public static void Postfix(HudManager __instance)
            {
                //__instance.SetHudActive(true);
            }
        }

        [HarmonyPatch(typeof(HudManager), nameof(HudManager.SetHudActive), typeof(PlayerControl), typeof(RoleBehaviour), typeof(bool))]
        public static class HudActiveModificationPatch
        {
            public static bool Prefix(HudManager __instance, [HarmonyArgument(0)] PlayerControl localPlayer,
                [HarmonyArgument(1)] RoleBehaviour role,
                [HarmonyArgument(2)] bool isActive)
            {
                // Adapted from: HudManager.cs
                __instance.AbilityButton.ToggleVisible(isActive && !hiddenItems.Contains(HudItem.UseButton));
                if (isActive && !hiddenItems.Contains(HudItem.UseButton))
                {
                    __instance.UseButton.Refresh();
                    __instance.AbilityButton.Refresh(role.Ability);
                }
                else
                {
                    __instance.UseButton.ToggleVisible(false);
                    __instance.PetButton.ToggleVisible(false);
                }
                bool flag = localPlayer.Data != null && localPlayer.Data.IsDead;
                __instance.ReportButton.ToggleVisible(isActive && !hiddenItems.Contains(HudItem.ReportButton) && !flag && GameManager.Instance.CanReportBodies() && ShipStatus.Instance != null);
                __instance.KillButton.ToggleVisible(false);
                __instance.SabotageButton.ToggleVisible(isActive && !hiddenItems.Contains(HudItem.SabotageButton) && role.IsImpostor);
                __instance.AdminButton.ToggleVisible(isActive && !hiddenItems.Contains(HudItem.AdminTable) && role.IsImpostor);
                __instance.ImpostorVentButton.ToggleVisible(isActive && !hiddenItems.Contains(HudItem.VentButton) && !flag && role.IsImpostor && GameOptionsManager.Instance.CurrentGameOptions.GameMode != GameModes.HideNSeek);
                __instance.TaskPanel.gameObject.SetActive(isActive && !hiddenItems.Contains(HudItem.TaskListPopup));
                __instance.roomTracker.gameObject.SetActive(isActive);
                if (__instance.joystick != null)
                {
                    __instance.joystick.ToggleVisuals(isActive);
                }
                __instance.ToggleRightJoystick(isActive);
                return false;
            }
        }

        [HarmonyPatch(typeof(SabotageButton), nameof(SabotageButton.Refresh))]
        public static class HideSabotageButtonPatch
        {
            public static bool Prefix(SabotageButton __instance)
            {
                if (hiddenItems.Contains(HudItem.SabotageButton))
                {
                    __instance.ToggleVisible(false);
                    __instance.SetDisabled();
                    return false;
                }

                return true;
            }
        }

        [HarmonyPatch(typeof(ReportButton), nameof(ReportButton.SetActive))]
        public static class HideReportButtonPatch
        {
            public static bool Prefix(ReportButton __instance)
            {
                if (hiddenItems.Contains(HudItem.ReportButton))
                {
                    __instance.ToggleVisible(false);
                    __instance.SetDisabled();
                    return false;
                }

                return true;
            }
        }

        [HarmonyPatch(typeof(AdminButton), nameof(AdminButton.Refresh))]
        public static class HideAdminButtonPatch
        {
            public static bool Prefix(AdminButton __instance)
            {
                if (hiddenItems.Contains(HudItem.AdminTable))
                {
                    __instance.ToggleVisible(false);
                    __instance.SetDisabled();
                    return false;
                }

                return true;
            }
        }

        [HarmonyPatch(typeof(HudManager), nameof(HudManager.ToggleUseAndPetButton))]
        public static class HideUseButtonPatch
        {
            public static bool Prefix(HudManager __instance)
            {
                if (hiddenItems.Contains(HudItem.UseButton))
                {
                    __instance.UseButton.ToggleVisible(false);
                    __instance.PetButton.ToggleVisible(false);
                    return false;
                }

                return true;
            }
        }
    }
}