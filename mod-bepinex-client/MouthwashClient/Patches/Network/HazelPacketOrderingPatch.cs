using System;
using System.Collections.Generic;
using HarmonyLib;
using Hazel;
using Hazel.Udp;
using Reactor.Utilities;

namespace MouthwashClient.Patches.Network
{
    // Authors: Polus.gg developers
    [HarmonyPatch(typeof(UdpConnection), nameof(UdpConnection.ReliableMessageReceive))]
    public class HazelPacketOrderingPatch {
        private static ushort _nextSequenceReceived;
        private static Dictionary<ushort, MessageReader> _packetQueue = new();

        public static void Reset() {
            _packetQueue = new Dictionary<ushort, MessageReader>();
            _nextSequenceReceived = 0;
        }

        [HarmonyPrefix]
        public static bool ReliableMessageReceive(UdpConnection __instance, [HarmonyArgument(0)] MessageReader reader, [HarmonyArgument(1)] int bytesReceived) {
            reader.Position++;

            ushort nonce = reader.ReadUInt16();

            __instance.SendAck(nonce);

            lock (_packetQueue) {
                if (!NetHelpers.SidGreaterThan(nonce, _nextSequenceReceived)) {
                    return false;
                }

                _packetQueue.Add(nonce, reader);
                if (_nextSequenceReceived != nonce) {
                    return false;
                }

                while (_packetQueue.ContainsKey(_nextSequenceReceived)) {
                    try
                    {
                        __instance.InvokeDataReceived(SendOption.Reliable, _packetQueue[_nextSequenceReceived], 3,
                            bytesReceived);
                    }
                    catch (Exception ex)
                    {
                        PluginSingleton<MouthwashClientPlugin>.Instance.Log.LogMessage($"Got exception while processing packet: {ex}");
                    }
                    _packetQueue.Remove(_nextSequenceReceived);
                    _nextSequenceReceived++;
                }
            }

            return false;
        }
    }
}