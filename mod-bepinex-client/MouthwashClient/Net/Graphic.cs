using Hazel;
using InnerNet;
using MouthwashClient.Enums;
using Reactor.Utilities.Attributes;
using UnityEngine;

namespace MouthwashClient.Net
{
    [RegisterInIl2Cpp]
    public class Graphic : InnerNetObject
    {
        public uint assetId;
    
        public override void HandleRpc(byte callId, MessageReader reader)
        {
            
        }

        public override bool Serialize(MessageWriter writer, bool initialState)
        {
            writer.WritePacked(assetId);
            return true;
        }

        public override void Deserialize(MessageReader reader, bool initialState)
        {
            assetId = reader.ReadPackedUInt32();
        }
    }
}