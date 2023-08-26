using System;
using HarmonyLib;
using Polus.Extensions;
using Polus.Mods.Patching.Common.Utilities;

namespace Polus {
    public class PermanentPggMod : PggMod {
        public override void LoadPatches(string harmonyName, Type[] types) {
            _harmony ??= new Harmony(harmonyName);
            foreach (Type type in types)
            {
                type.Log();
                ToggledPatches.AddRange(PatchManagerUtils.ResolvePatchDetails(type, true));
            }
        }
    }
}