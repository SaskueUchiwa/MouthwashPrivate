using AmongUs.GameOptions;
using HarmonyLib;
using Hazel;
using InnerNet;
using MouthwashClient.Enums;
using MouthwashClient.Net;
using UnityEngine;

namespace MouthwashClient.Patches.Game
{
    public static class MouthwashRolePatches
    {
        [HarmonyPatch(typeof(RoleManager), nameof(RoleManager.SetRole))]
        public static class OnlyMouthwashRolePatch
        {
            public static RoleBehaviour? MouthwashBasicRole;
            
            public static bool Prefix(RoleManager __instance, ref RoleTypes roleType)
            {
                if (MouthwashBasicRole == null)
                {
                    GameObject roleContainerObject = new GameObject();
                    MouthwashBasicRole = roleContainerObject.AddComponent<MouthwashRole>();
                }
                roleType = RoleTypes.Crewmate;
                __instance.AllRoles = new[] { MouthwashBasicRole };
                return true;
            }
        }
        
        [HarmonyPatch(typeof(InnerNetClient), nameof(InnerNetClient.HandleMessage))]
        public static bool Prefix(InnerNetClient __instance,
            [HarmonyArgument(0)] MessageReader reader, [HarmonyArgument(1)] SendOption sendOption)
        {
            switch (reader.Tag)
            {
                case (byte)MouthwashRootPacketTag.SetRoleTeam:
                    break;
            }
            return true;
        }
    }
}