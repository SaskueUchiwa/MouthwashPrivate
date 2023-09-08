using System.Threading.Tasks;
using BepInEx;
using BepInEx.Configuration;
using BepInEx.Unity.IL2CPP;
using HarmonyLib;
using MouthwashClient.Services;
using Reactor;
using Reactor.Utilities;
using UnityEngine;

namespace MouthwashClient
{
    [BepInAutoPlugin]
    [BepInProcess("Among Us.exe")]
    [BepInDependency(ReactorPlugin.Id)]
    public partial class MouthwashClientPlugin : BasePlugin
    {
        public Harmony Harmony { get; } = new(Id);

        public ConfigEntry<string> ConfigName { get; private set; }

        public override void Load()
        {
            Harmony.PatchAll();
        }
    }
}
