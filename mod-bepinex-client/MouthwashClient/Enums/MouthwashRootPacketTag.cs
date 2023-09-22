﻿namespace MouthwashClient.Enums
{
    public enum MouthwashRootPacketTag
    {
        FetchResource = 0x80,
        Resize,
        Intro,
        OverwriteGameOver,
        SetHudString,
        DeclareHat,
        SetGameOption = 0x89,
        DeleteGameOption,
        SetHudVisibility = 0x8c,
        AllowTaskInteraction,
        SetTaskCounts,
        LoadHat = 0x96,
        LoadPet,
        SetBody,
        LoadSkin,
        ChangeScene,
        MarkAssBrown,
        ModstampSetString,
        SetChatMessage,
        DeleteChatMessage,
        SetRoleTeam,
        DisplaySystemAnnouncement = 0xfa,
        UpdateDiscordRichPresence,
        SetQrCodeContents
    }
}