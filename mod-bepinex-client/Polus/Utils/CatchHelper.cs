using System;
using System.Collections.Generic;
using System.Linq;
using BepInEx.Logging;
using Polus.Extensions;
using Polus.Patches.Permanent;

namespace Polus.Utils {
    public static class CatchHelper {
        // trollface emote goes here

        public static void TryCatch(Action action, bool logs = true, Action catchAction = null) {
            try {
                action();
            } catch (Exception e) {
                if (logs) {
                    e.Log(level: LogLevel.Error);
                }
                catchAction?.Invoke();
            }
        }

        public static T TryCatch<T>(Func<T> action, bool logs = true, Action catchAction = null) {
            try {
                return action();
            } catch (Exception e) {
                if (logs) {
                    e.Log(level: LogLevel.Error);
                }
                catchAction?.Invoke();
            }

            return default;
        }

        public static void Init() {
            
        }
    }
}