using System;
using System.Collections.Generic;
using Hazel;
using InnerNet;
using MouthwashClient.Patches.Lobby;
using Reactor.Utilities.Attributes;
using UnityEngine;

namespace MouthwashClient.Net
{
    [RegisterInIl2Cpp]
    public class ClickBehaviour : InnerNetObject
    {
        public float maxTimer = 0f;
        public float currentTime = 0f;
        public bool saturated = false;
        public Color color = Color.white;
        public bool countingDown = false;
        public ushort[] keys = {};
    
        public override void HandleRpc(byte callId, MessageReader reader)
        {
            base.HandleRpc(callId, reader);
        }

        public void FixedUpdate()
        {
            currentTime -= Time.deltaTime;
            if (currentTime < 0f)
            {
                currentTime = 0f;
            }
        }

        public void Awake()
        {
            
        }

        public void Update()
        {
            
        }

        public override bool Serialize(MessageWriter writer, bool initialState)
        {
            writer.Write(maxTimer);
            writer.Write(currentTime);
            writer.Write(countingDown);
            writer.Write(saturated);
            MouthwashChatMessageAppearance.WriteColor(writer, color);
            foreach (ushort key in keys)
            {
                writer.Write(key);
            }
            return true;
        }

        public override void Deserialize(MessageReader reader, bool initialState)
        {
            maxTimer = reader.ReadSingle();
            currentTime = reader.ReadSingle();
            countingDown = reader.ReadBoolean();
            saturated = reader.ReadBoolean();
            color = MouthwashChatMessageAppearance.ReadColor(reader);
            List<ushort> newKeys = new();
            while (reader.BytesRemaining > 0)
            {
                newKeys.Add(reader.ReadUInt16());
            }

            keys = newKeys.ToArray();
        }
    }
}