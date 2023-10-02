using System;
using Hazel;
using InnerNet;
using Reactor.Utilities.Attributes;
using UnityEngine;

namespace MouthwashClient.Net
{
    [RegisterInIl2Cpp]
    public class CameraController : InnerNetObject
    {
        public Vector2 offset = Vector2.zero;
    
        public override void HandleRpc(byte callId, MessageReader reader)
        {
            base.HandleRpc(callId, reader);
        }

        public void Awake()
        {
            if (OwnerId != PlayerControl.LocalPlayer.OwnerId)
                return;
            if (!DestroyableSingleton<HudManager>.InstanceExists)
                return;
            if (DestroyableSingleton<HudManager>.Instance.PlayerCam == null)
                return;

            DestroyableSingleton<HudManager>.Instance.PlayerCam.Target = this;
        }

        public void OnDestroy()
        {
            if (OwnerId == 0)
                return;
            if (!DestroyableSingleton<HudManager>.InstanceExists)
                return;
            if (DestroyableSingleton<HudManager>.Instance.PlayerCam == null)
                return;
            
            DestroyableSingleton<HudManager>.Instance.PlayerCam.Target = PlayerControl.LocalPlayer;
        }

        public void Update()
        {
            if (OwnerId == 0)
                return;
            
            if (OwnerId != PlayerControl.LocalPlayer.OwnerId)
                return;
            
            if (PlayerControl.LocalPlayer == null)
                return;

            transform.position = PlayerControl.LocalPlayer.transform.position + new Vector3(offset.x, offset.y, 0f);
        }

        public override bool Serialize(MessageWriter writer, bool initialState)
        {
            NetHelpers.WriteVector2(offset, writer);
            return true;
        }

        public override void Deserialize(MessageReader reader, bool initialState)
        {
            offset = NetHelpers.ReadVector2(reader);
        }
    }
}