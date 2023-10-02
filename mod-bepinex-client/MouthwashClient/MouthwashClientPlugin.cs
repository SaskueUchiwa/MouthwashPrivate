using System.Net.Http;
using System.Threading.Tasks;
using BepInEx;
using BepInEx.Configuration;
using BepInEx.Unity.IL2CPP;
using HarmonyLib;
using MouthwashClient.Services;
using Reactor;
using Reactor.Utilities;
using TMPro;
using UnityEngine;

namespace MouthwashClient
{
    [BepInPlugin(Id, "Polus.GG: Rewritten", VersionString)]
    [BepInProcess("Among Us.exe")]
    [BepInDependency(ReactorPlugin.Id)]
    public partial class MouthwashClientPlugin : BasePlugin
    {
        public Harmony Harmony { get; } = new(Id);
        public const string Id = "gg.polus.rewritten";
        public const string VersionString = "2.0.0";

        public ConfigEntry<string> ConfigName { get; private set; }

        public HttpClient httpClient;

        public override void Load()
        {
            Harmony.PatchAll();
            httpClient = new();
        }
    }
}
