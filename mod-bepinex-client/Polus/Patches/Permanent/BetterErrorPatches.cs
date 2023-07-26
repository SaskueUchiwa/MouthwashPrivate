using System.Linq;
using BepInEx.IL2CPP.Logging;
using BepInEx.Logging;
using HarmonyLib;
using Il2CppSystem;
using Il2CppSystem.Diagnostics;
using Polus.Extensions;
using Polus.Mods.Patching;
using Polus.Utils;
using UnhollowerBaseLib;
using UnityEngine;
using ArgumentOutOfRangeException = System.ArgumentOutOfRangeException;
using Debug = UnityEngine.Debug;
using IntPtr = System.IntPtr;
using Object = Il2CppSystem.Object;

namespace Polus.Patches.Permanent {
    public class BetterErrorPatches {
        [HarmonyPatch(typeof(Il2CppException), nameof(Il2CppException.RaiseExceptionIfNecessary))]
        public static class Il2cppExceptionPatch {
            [PermanentPatch]
            [HarmonyPrefix]
            public static bool RaiseExceptionIfNecessary([HarmonyArgument(0)] IntPtr returnedException) {
                if (!(returnedException == IntPtr.Zero)) {
                    new StackTrace(new Exception(returnedException), false).ToString().Log(1, "stack trace", LogLevel.Error);
                    Il2CppException ex = new(returnedException);
                    throw ex;
                }
                return false;
            }
        }
        public static class DebugLogTrace {
            public static readonly LogType[] LogTypes = {
                LogType.Error,
                LogType.Exception,
            };
            public static void Initialize() {
                "Adding Unity trace logger".Log(50);
                ManualLogSource traceLogger = BepInEx.Logging.Logger.CreateLogSource("UnityTrace");
                Application.add_logMessageReceived(new System.Action<string, string, LogType>((_, ex, type) => {
                    if (!LogTypes.Contains(type)) {
                        return;
                    }
                    ex.Log(traceLogger, level: type switch {
                        LogType.Error => LogLevel.Error,
                        LogType.Assert => LogLevel.Debug,
                        LogType.Warning => LogLevel.Warning,
                        LogType.Log => LogLevel.Message,
                        LogType.Exception => LogLevel.Error,
                        _ => LogLevel.Message
                    });
                }));
            }
        }
    }
}