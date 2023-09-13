﻿using HarmonyLib;
using Hazel;
using InnerNet;
using MouthwashClient.Enums;
using MouthwashClient.Services;

namespace MouthwashClient.Patches.OnlinePlay
{
    public static class RemoteResourcesPatches
    {
        [HarmonyPatch(typeof(InnerNetClient), nameof(InnerNetClient.HandleMessage))]
        public static class FetchResourcePatch
        {
            public static bool Prefix(InnerNetClient __instance,
                [HarmonyArgument(0)] MessageReader reader, [HarmonyArgument(1)] SendOption sendOption)
            {
                switch (reader.Tag)
                {
                    case (int)MouthwashRootPacketTag.FetchResource:
                        int resourceId = reader.ReadPackedInt32();
                        string resourceLocation = reader.ReadString();
                        byte[] bytes = reader.ReadBytes(32);
                        uint resourceType = reader.ReadByte();
                        __instance.StartCoroutine(
                            RemoteResourceService.CoFetchResourceAtLocationAndVerify(resourceId, resourceLocation,
                                bytes, (ResourceType)resourceType));
                        return false;
                }

                return true;
            }
        }
    }
}