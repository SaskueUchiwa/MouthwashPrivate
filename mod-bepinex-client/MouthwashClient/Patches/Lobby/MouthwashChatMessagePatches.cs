using System;
using System.Collections.Generic;
using AmongUs.QuickChat;
using HarmonyLib;
using Hazel;
using InnerNet;
using Innersloth.Assets;
using MouthwashClient.Enums;
using Reactor.Utilities;
using UnityEngine;

namespace MouthwashClient.Patches.Lobby
{
    public class MouthwashChatMessageAppearance
    {
        static Color ReadColor(MessageReader reader)
        {
            byte r = reader.ReadByte();
            byte g = reader.ReadByte();
            byte b = reader.ReadByte();
            byte a = reader.ReadByte();
            return new Color(r / 255f, g / 255f, b / 255f, a / 255f);
        }

        static void WriteColor(MessageWriter writer, Color color)
        {
            writer.Write((byte)(color.r * 255f));
            writer.Write((byte)(color.g * 255f));
            writer.Write((byte)(color.b * 255f));
            writer.Write((byte)(color.a * 255f));
        }
        
        public static MouthwashChatMessageAppearance Deserialize(MessageReader reader)
        {
            string playerName = reader.ReadString();
            bool isDead = reader.ReadBoolean();
            bool isVote = reader.ReadBoolean();
            string playerHat = reader.ReadString();
            string playerPet = reader.ReadString();
            string playerSkin = reader.ReadString();
            string playerVisor = reader.ReadString();
            Color backColor = ReadColor(reader);
            Color frontColor = ReadColor(reader);
            Color visorColor = ReadColor(reader);
            return new MouthwashChatMessageAppearance(playerName, isDead, isVote, playerHat,
                playerPet, playerSkin, playerVisor, backColor, frontColor, visorColor);
        }

        public string PlayerName;
        public bool IsDead;
        public bool IsVote;
        public string PlayerHat;
        public string PlayerPet;
        public string PlayerSkin;
        public string PlayerVisor;
        public Color BackColor;
        public Color FrontColor;
        public Color VisorColor;

        private MouthwashChatMessageAppearance(string playerName, bool isDead, bool isVote,
            string playerHat, string playerPet, string playerSkin, string playerVisor, Color backColor,
            Color frontColor, Color visorColor)
        {
            PlayerName = playerName;
            IsDead = isDead;
            IsVote = isVote;
            PlayerHat = playerHat;
            PlayerPet = playerPet;
            PlayerSkin = playerSkin;
            PlayerVisor = playerVisor;
            BackColor = backColor;
            FrontColor = frontColor;
            VisorColor = visorColor;
        }

        public void Serialize(MessageWriter writer)
        {
            writer.Write(PlayerName);
            writer.Write(IsDead);
            writer.Write(IsVote);
            writer.Write(PlayerHat);
            writer.Write(PlayerPet);
            writer.Write(PlayerSkin);
            writer.Write(PlayerVisor);
            WriteColor(writer, BackColor);
            WriteColor(writer, FrontColor);
            WriteColor(writer, VisorColor);
        }
    }

    public enum MouthwashChatMessageAlignment
    {
        Left,
        Center,
        Right
    }

    // TODO: quickchat
    public class MouthwashChatMessage
    {
        public static MouthwashChatMessage Deserialize(MessageReader reader)
        {
            string uuid = Convert.ToHexString(reader.ReadBytes(16));
            MouthwashChatMessageAlignment alignment = (MouthwashChatMessageAlignment)reader.ReadByte();
            MouthwashChatMessageAppearance appearance = MouthwashChatMessageAppearance.Deserialize(reader);
            float pitch = reader.ReadSingle();
            bool isQuickChat = reader.ReadBoolean();
            if (isQuickChat)
            {
                QuickChatPhraseBuilderResult content = QuickChatNetData.Deserialize(reader);
                return new MouthwashChatMessage(uuid, alignment, appearance, pitch, true, null, content);
            }
            else
            {
                string content = reader.ReadString();
                return new MouthwashChatMessage(uuid, alignment, appearance, pitch, false, content, null);
            }
        }

        public string Uuid;
        public MouthwashChatMessageAlignment Alignment;
        public MouthwashChatMessageAppearance Appearance;
        public float Pitch;
        public bool IsQuickChat;
        public string? Content;
        public QuickChatPhraseBuilderResult? QuickChatContent;

        private MouthwashChatMessage(string uuid, MouthwashChatMessageAlignment alignment,
            MouthwashChatMessageAppearance appearance, float pitch, bool isQuickChat,
            string? content, QuickChatPhraseBuilderResult? quickChatContent)
        {
            Uuid = uuid;
            Alignment = alignment;
            Appearance = appearance;
            Pitch = pitch;
            IsQuickChat = isQuickChat;
            Content = content;
            QuickChatContent = quickChatContent;
        }

        public void Serialize(MessageWriter writer)
        {
            writer.Write(Convert.FromHexString(Uuid));
            writer.Write((byte)Alignment);
            Appearance.Serialize(writer);
            writer.Write(Pitch);
            writer.Write(IsQuickChat);
            if (IsQuickChat)
            {
                QuickChatNetData.Serialize(QuickChatContent, writer);
            }
            else
            {
                writer.Write(Content);
            }
        }
    }
    
    public class MouthwashChatMessagePatches
    {
        public static Dictionary<string, ChatBubble?> ExistingChatMessages = new();

        [HarmonyPatch(typeof(ChatController), nameof(ChatController.AddChat))]
        public static class PreventChatBubblePatch
        {
            public static bool Prefix(ChatController __instance)
            {
                return false;
            }
        }

        public static ChatBubble? GetPooledBubble()
        {
            ObjectPoolBehavior poolBehavior = DestroyableSingleton<HudManager>.Instance.Chat.chatBubblePool;
            if (poolBehavior.NotInUse == 0)
            {
                poolBehavior.ReclaimOldest();
            }

            return poolBehavior.Get<ChatBubble>();
        }

        public static void SetCustomColors(Renderer rend, Color frontColor, Color backColor, Color visorColor)
        {
            // Reconstructed from: PlayerMaterial.cs
            rend.material.SetColor("_BackColor", backColor);
            rend.material.SetColor("_BodyColor", frontColor);
            rend.material.SetColor("_VisorColor", visorColor);
        }

        public static void SetHatAppearanceColors(HatParent hat, Color frontColor, Color backColor, Color visorColor)
        {
            // Reconstructed from: HatParent.cs
            AddressableAsset<HatViewData> addressableAsset = hat.hatDataAsset;
            HatViewData hatViewData = (addressableAsset != null) ? addressableAsset.GetAsset() : null;
            if (hatViewData && hatViewData.AltShader)
            {
                hat.FrontLayer.sharedMaterial = hatViewData.AltShader;
                if (hat.BackLayer)
                {
                    hat.BackLayer.sharedMaterial = hatViewData.AltShader;
                }
            }
            else
            {
                hat.FrontLayer.sharedMaterial = DestroyableSingleton<HatManager>.Instance.DefaultShader;
                if (hat.BackLayer)
                {
                    hat.BackLayer.sharedMaterial = DestroyableSingleton<HatManager>.Instance.DefaultShader;
                }
            }
            SetCustomColors(hat.FrontLayer, frontColor, backColor, visorColor);
            if (hat.BackLayer)
            {
                SetCustomColors(hat.BackLayer, frontColor, backColor, visorColor);
            }
            hat.FrontLayer.material.SetInt(PlayerMaterial.MaskLayer, hat.matProperties.MaskLayer);
            if (hat.BackLayer)
            {
                hat.BackLayer.material.SetInt(PlayerMaterial.MaskLayer, hat.matProperties.MaskLayer);
            }
            PlayerMaterial.MaskType maskType = hat.matProperties.MaskType;
            if (maskType == PlayerMaterial.MaskType.ScrollingUI)
            {
                if (hat.FrontLayer)
                {
                    hat.FrontLayer.maskInteraction = SpriteMaskInteraction.VisibleInsideMask;
                }
                if (hat.BackLayer)
                {
                    hat.BackLayer.maskInteraction = SpriteMaskInteraction.VisibleInsideMask;
                }
            }
            else if (maskType == PlayerMaterial.MaskType.Exile)
            {
                if (hat.FrontLayer)
                {
                    hat.FrontLayer.maskInteraction = SpriteMaskInteraction.VisibleOutsideMask;
                }
                if (hat.BackLayer)
                {
                    hat.BackLayer.maskInteraction = SpriteMaskInteraction.VisibleOutsideMask;
                }
            }
            else
            {
                if (hat.FrontLayer)
                {
                    hat.FrontLayer.maskInteraction = SpriteMaskInteraction.None;
                }
                if (hat.BackLayer)
                {
                    hat.BackLayer.maskInteraction = SpriteMaskInteraction.None;
                }
            }
        }

        public static void SetSkinAppearanceColors(SkinLayer skin, Color frontColor, Color backColor, Color visorColor)
        {
            PlayerMaterial.MaskType maskType = skin.matProperties.MaskType;
            if (skin.skin && skin.skin.MatchPlayerColor)
            {
                if (maskType == PlayerMaterial.MaskType.ComplexUI || maskType == PlayerMaterial.MaskType.ScrollingUI)
                {
                    skin.layer.sharedMaterial = DestroyableSingleton<HatManager>.Instance.MaskedPlayerMaterial;
                }
                else
                {
                    skin.layer.sharedMaterial = DestroyableSingleton<HatManager>.Instance.PlayerMaterial;
                }
            }
            else if (maskType == PlayerMaterial.MaskType.ComplexUI || maskType == PlayerMaterial.MaskType.ScrollingUI)
            {
                skin.layer.sharedMaterial = DestroyableSingleton<HatManager>.Instance.MaskedMaterial;
            }
            else
            {
                skin.layer.sharedMaterial = DestroyableSingleton<HatManager>.Instance.DefaultShader;
            }
            if (maskType == PlayerMaterial.MaskType.SimpleUI)
            {
                skin.layer.maskInteraction = SpriteMaskInteraction.VisibleInsideMask;
            }
            else if (maskType == PlayerMaterial.MaskType.Exile)
            {
                skin.layer.maskInteraction = SpriteMaskInteraction.VisibleOutsideMask;
            }
            else
            {
                skin.layer.maskInteraction = SpriteMaskInteraction.None;
            }
            skin.layer.material.SetInt(PlayerMaterial.MaskLayer, skin.matProperties.MaskLayer);
            if (skin.skin && skin.skin.MatchPlayerColor)
            {
                SetCustomColors(skin.layer, frontColor, backColor, visorColor);
            }
        }

        public static void SetVisorAppearanceColors(VisorLayer visor, Color frontColor, Color backColor, Color visorColor)
        {
            if (visor.IsLoaded && visor.viewAsset.GetAsset().AltShader)
            {
                visor.Image.sharedMaterial = visor.viewAsset.GetAsset().AltShader;
            }
            else
            {
                visor.Image.sharedMaterial = DestroyableSingleton<HatManager>.Instance.DefaultShader;
            }
            PlayerMaterial.SetColors(visor.matProperties.ColorId, visor.Image);
            PlayerMaterial.MaskType maskType = visor.matProperties.MaskType;
            if (maskType == PlayerMaterial.MaskType.SimpleUI || maskType == PlayerMaterial.MaskType.ScrollingUI)
            {
                visor.Image.maskInteraction = SpriteMaskInteraction.VisibleInsideMask;
                return;
            }
            if (maskType == PlayerMaterial.MaskType.Exile)
            {
                visor.Image.maskInteraction = SpriteMaskInteraction.VisibleOutsideMask;
                return;
            }
            visor.Image.maskInteraction = SpriteMaskInteraction.None;
        }
        
        public static void SetHat(ChatBubble? bubble, MouthwashChatMessage chatMessage)
        {
            // Reconstructed from: HatParent.cs
            HatData foundHat = DestroyableSingleton<HatManager>.Instance.GetHatById(chatMessage.Appearance.PlayerHat);
            bubble.Player.cosmetics.hat.Hat = foundHat;
            bubble.Player.cosmetics.hat.UnloadAsset();
            bubble.Player.cosmetics.hat.hatDataAsset = bubble.Player.cosmetics.hat.Hat.CreateAddressableAsset();
            bubble.Player.cosmetics.hat.hatDataAsset.LoadAsync(new Action(delegate
            {
                bubble.Player.cosmetics.hat.PopulateFromHatViewData();
                SetHatAppearanceColors(bubble.Player.cosmetics.hat, chatMessage.Appearance.FrontColor,
                    chatMessage.Appearance.BackColor, chatMessage.Appearance.VisorColor);
            }));
        }

        public static void SetSkin(string skinId, ChatBubble? bubble, MouthwashChatMessage chatMessage)
        {
            // Reconstructed from: SkinLayer.cs
            SkinData foundSkin = DestroyableSingleton<HatManager>.Instance.GetSkinById(skinId);
            AddressableAssetGroup item = AddressableAssetHandler.GetOrCreate(bubble.Player.cosmetics.skin.gameObject).Item2;
            AddressableAsset<SkinViewData> asset = foundSkin.CreateAddressableAsset();
            item.Add(asset);
            bubble.Player.cosmetics.currentBodySprite.BodySprite.flipX = chatMessage.Alignment == MouthwashChatMessageAlignment.Right;
            asset.LoadAsync(new Action(delegate
            {
                SkinViewData skinView = asset.GetAsset();
                if (bubble.Player.cosmetics.skin.IsDestroyedOrNull() ||
                    bubble.Player.cosmetics.skin.gameObject.IsDestroyedOrNull())
                    return;
                
                bubble.Player.cosmetics.skin.skin = skinView;
                SetSkinAppearanceColors(bubble.Player.cosmetics.skin, chatMessage.Appearance.FrontColor, chatMessage.Appearance.BackColor,
                    chatMessage.Appearance.VisorColor);
                bubble.Player.cosmetics.skin.SetIdle(bubble.Player.cosmetics.currentBodySprite.BodySprite.flipX);
            }), new Action(delegate { }), null);
        }

        public static void SetVisor(ChatBubble? bubble, MouthwashChatMessage chatMessage)
        {
            // Reconstructed from: VisorLayer.cs
            VisorData foundVisor = DestroyableSingleton<HatManager>.Instance.GetVisorById(chatMessage.Appearance.PlayerVisor);
            bubble.Player.cosmetics.visor.currentVisor = foundVisor;
            bubble.Player.cosmetics.visor.UnloadAsset();
            AddressableAssetGroup item = AddressableAssetHandler.GetOrCreate(bubble.Player.cosmetics.skin.gameObject).Item2;
            AddressableAsset<VisorViewData> asset = foundVisor.CreateAddressableAsset();
            bubble.Player.cosmetics.visor.viewAsset = asset;
            item.Add(asset);
            asset.LoadAsync(new Action(delegate
            {
                VisorViewData visorView = asset.GetAsset();
                if (visorView == null || bubble.Player.cosmetics.skin.IsDestroyedOrNull() ||
                    bubble.Player.cosmetics.skin.gameObject.IsDestroyedOrNull())
                    return;

                if (foundVisor.BehindHats)
                {
                    bubble.Player.cosmetics.visor.transform.SetLocalZ(bubble.Player.cosmetics.visor.ZIndexSpacing * -1.5f);
                }
                else
                {
                    bubble.Player.cosmetics.visor.transform.SetLocalZ(bubble.Player.cosmetics.visor.ZIndexSpacing * -3f);
                }
                bubble.Player.cosmetics.visor.SetFlipX(bubble.Player.cosmetics.visor.Image.flipX);
                SetVisorAppearanceColors(bubble.Player.cosmetics.visor, chatMessage.Appearance.FrontColor,
                    chatMessage.Appearance.BackColor,
                    chatMessage.Appearance.VisorColor);
            }), new Action(delegate { }), null);
            bubble.Player.cosmetics.visor.Image.flipX = chatMessage.Alignment == MouthwashChatMessageAlignment.Right;
        }

        public static void SetBodyColor(CosmeticsLayer cosmetics, Color frontColor, Color backColor, Color visorColor)
        {
            PlayerMaterial.MaskType maskType = cosmetics.bodyMatProperties.MaskType;
            Material bodyMaterial = CosmeticsLayer.GetBodyMaterial(maskType);
            SpriteMaskInteraction bodySpriteMaskInteraction = CosmeticsLayer.GetBodySpriteMaskInteraction(maskType);
            foreach (PlayerBodySprite playerBodySprite in cosmetics.bodySprites)
            {
                playerBodySprite.BodySprite.sharedMaterial = bodyMaterial;
                playerBodySprite.BodySprite.maskInteraction = bodySpriteMaskInteraction;
            }
            if (cosmetics.currentBodySprite != null)
            {
                cosmetics.currentBodySprite.BodySprite.material.SetInt(PlayerMaterial.MaskLayer, cosmetics.bodyMatProperties.MaskLayer);
                SetCustomColors(cosmetics.currentBodySprite.BodySprite, frontColor, backColor, visorColor);
                if (cosmetics.currentBodySprite != null && cosmetics.currentBodySprite.PettingHand != null)
                {
                    SetCustomColors(cosmetics.currentBodySprite.PettingHand.HandSprite, frontColor, backColor, visorColor);
                }
                if (cosmetics.currentBodySprite != null && cosmetics.currentBodySprite.HandHat != null)
                {
                    SetCustomColors(cosmetics.currentBodySprite.HandHat, frontColor, backColor, visorColor);
                }
            }
        }

        public static void AddChatMessage(MouthwashChatMessage chatMessage)
        {
            ChatBubble? bubble = GetPooledBubble();
            UpdateChatMessage(bubble, chatMessage);
            ChatController chat = DestroyableSingleton<HudManager>.Instance.Chat;
            if (!chat.IsOpenOrOpening && chat.notificationRoutine == null)
            {
                chat.notificationRoutine = chat.StartCoroutine(chat.BounceDot());
            }
            if (chatMessage.Alignment == MouthwashChatMessageAlignment.Left)
            {
                // TODO: Pitch
                SoundManager.Instance.PlaySound(chat.messageSound, false, 1f, null).pitch = 0.5f + (float)PlayerControl.LocalPlayer.PlayerId / 15f;
            }
        }

        public static void UpdateChatMessage(ChatBubble? bubble, MouthwashChatMessage chatMessage)
        {
            ChatController chat = DestroyableSingleton<HudManager>.Instance.Chat;
            bubble.transform.SetParent(chat.scroller.Inner);
            bubble.transform.localScale = Vector3.one;
            switch (chatMessage.Alignment)
            {
                case MouthwashChatMessageAlignment.Center:
                    // TODO: work out center positioning
                    break;
                case MouthwashChatMessageAlignment.Left:
                    bubble.SetLeft();
                    break;
                case MouthwashChatMessageAlignment.Right:
                    bubble.SetRight();
                    break;
            }
            bubble.Player.SetName(chatMessage.Appearance.PlayerName);
            bubble.Player.cosmetics.SetMaskType(PlayerMaterial.MaskType.ScrollingUI);
            foreach (SpriteRenderer handRend in bubble.Player.Hands)
            {
                handRend.sharedMaterial = CosmeticsLayer.GetBodyMaterial(PlayerMaterial.MaskType.ScrollingUI);
                SetCustomColors(handRend, chatMessage.Appearance.FrontColor, chatMessage.Appearance.BackColor,
                    chatMessage.Appearance.VisorColor);
            }
            foreach (SpriteRenderer otherBodyRend in bubble.Player.OtherBodySprites)
            {
                otherBodyRend.sharedMaterial = CosmeticsLayer.GetBodyMaterial(PlayerMaterial.MaskType.ScrollingUI);
                SetCustomColors(otherBodyRend, chatMessage.Appearance.FrontColor, chatMessage.Appearance.BackColor,
                    chatMessage.Appearance.VisorColor);
            }
            if (chatMessage.Appearance.IsDead)
            {
                SetSkin("" /* chatMessage.Appearance.PlayerSkin */, bubble, chatMessage);
                bubble.Player.cosmetics.SetHatColor(Palette.HalfWhite);
                bubble.Player.cosmetics.SetVisorAlpha(Palette.HalfWhite.a);
            }
            else
            {
                SetSkin(chatMessage.Appearance.PlayerSkin, bubble, chatMessage);
                bubble.Player.cosmetics.SetHatColor(Palette.White);
                bubble.Player.cosmetics.SetVisorAlpha(Palette.White.a);
            }
            SetHat(bubble, chatMessage);
            SetVisor(bubble, chatMessage);
            bubble.Player.ToggleName(false);
            bubble.maskLayer = 51 + bubble.PoolIndex;
            bubble.SetMaskLayer();
            bubble.SetName(chatMessage.Appearance.PlayerName, chatMessage.Appearance.IsDead, chatMessage.Appearance.IsVote, Color.white);
            if (chatMessage.IsQuickChat)
            {
                bubble.SetText(chatMessage.QuickChatContent!.ToChatText());
            }
            else
            {
                bubble.SetText(chatMessage.Content);
            }
            bubble.AlignChildren();
            chat.AlignAllBubbles();
            SetBodyColor(bubble.Player.cosmetics, chatMessage.Appearance.FrontColor, chatMessage.Appearance.BackColor,
                chatMessage.Appearance.VisorColor);
            // not including pet since it's hard-coded as not to show in the code. this might be worth checking out though
        }
        
        [HarmonyPatch(typeof(InnerNetClient), nameof(InnerNetClient.HandleMessage))]
        public static class HandleGameOptionsAddDeletePatch
        {
            public static bool Prefix(InnerNetClient __instance,
                [HarmonyArgument(0)] MessageReader reader, [HarmonyArgument(1)] SendOption sendOption)
            {
                switch (reader.Tag)
                {
                    case (int)MouthwashRootPacketTag.SetChatMessage:
                    {
                        MouthwashChatMessage chatMessage = MouthwashChatMessage.Deserialize(reader);
                        if (ExistingChatMessages.TryGetValue(chatMessage.Uuid, out ChatBubble? chatBubble))
                        {
                            if (chatBubble == null)
                            {
                                AddChatMessage(chatMessage);
                            }
                            else
                            {
                                UpdateChatMessage(chatBubble, chatMessage);
                            }
                        }
                        else
                        {
                            AddChatMessage(chatMessage);
                        }

                        break;
                    }
                    case (int)MouthwashRootPacketTag.DeleteChatMessage:
                    {
                        break;
                    }
                }
                return true;
            }
        }
    }
}