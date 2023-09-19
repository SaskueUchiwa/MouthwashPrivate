using Hazel;
using InnerNet;
using MouthwashClient.Enums;
using Reactor.Utilities.Attributes;
using UnityEngine;

namespace MouthwashClient.Net
{
    public enum EdgeAlignment
    {
        None,
        Left,
        Right,
        Bottom = 4,
        LeftBottom,
        RightBottom,
        Top = 8,
        LeftTop,
        RightTop,
        Meeting
    }
    
    [RegisterInIl2Cpp]
    public class CustomNetworkTransformGeneric : InnerNetObject
    {
        public EdgeAlignment Alignment = EdgeAlignment.None;
        public Vector2 position = Vector2.zero;
        public float zPosition;
        public uint attachedToNetId;
    
        public override void HandleRpc(byte callId, MessageReader reader)
        {
            switch (callId)
            {
                case 21: // snap to: the same as used in CustomNetworkTransform
                    position = NetHelpers.ReadVector2(reader);
                    reader.ReadUInt16(); // we can skip the sequence id because it's unused
                    break;
            }
            base.HandleRpc(callId, reader);
        }

        public void Awake()
        {
            
        }

        public void Update()
        {
            
        }

        public override bool Serialize(MessageWriter writer, bool initialState)
        {
            writer.Write((byte)Alignment);
            NetHelpers.WriteVector2(position, writer);
            writer.Write(zPosition);
            writer.WritePacked(attachedToNetId);
            return true;
        }

        public override void Deserialize(MessageReader reader, bool initialState)
        {
            Alignment = (EdgeAlignment)reader.ReadByte();
            position = NetHelpers.ReadVector2(reader);
            zPosition = reader.ReadSingle();
            attachedToNetId = reader.ReadPackedUInt32();
        }
    }
}