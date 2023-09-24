using HarmonyLib;
using Hazel;
using InnerNet;
using MouthwashClient.Enums;
using MouthwashClient.Patches.Lobby;

namespace MouthwashClient.Patches.Game
{
    [HarmonyPatch(typeof(PlayerControl), nameof(PlayerControl.HandleRpc))]
    public static class PlayerSetOutlineMessageHandlePatch
    {
        public static bool Prefix(PlayerControl __instance,
            [HarmonyArgument(0)] byte callId, [HarmonyArgument(1)] MessageReader reader)
        {
            switch (callId)
            {
                case (byte)MouthwashRpcPacketTag.SetOutline:
                    __instance.cosmetics.normalBodySprite.BodySprite.material.SetFloat("_Outline", reader.ReadByte());
                    __instance.cosmetics.normalBodySprite.BodySprite.material.SetColor("_OutlineColor", MouthwashChatMessageAppearance.ReadColor(reader));
                    break;
            }

            return true;
        }
    }
}