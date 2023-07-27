using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Il2CppSystem.Diagnostics;
using Newtonsoft.Json;
using Polus.Extensions;

namespace Polus.ServerList
{
    public static class ServerListLoader
    {
        private static readonly HttpClient Client = new();
        public static async Task<ServerModel[]> Load()
        {
            var successfulServers = new List<ServerModel>()
            {
                new()
                {
                    Address = "region.mouthwash.midlight.studio",
                    Region = "Solar System",
                    Subregion = "Earth",
                    Name = "Global",
                    Maintenance = false,
                    Ip = "65.109.160.245"
                }
            };
            
            try
            {
                var servers = JsonConvert.DeserializeObject<ServerModel[]>(
                    await Client.GetStringAsync("https://serverlist.polus.gg/regions.json")
                ) ?? Array.Empty<ServerModel>();

                foreach (var server in servers)
                {
                    try
                    {
                        var ipAddr = (await Dns.GetHostAddressesAsync(server.Address)).FirstOrDefault();
                        if (ipAddr is not null && !server.Maintenance)
                        {
                            server.Ip = ipAddr.ToString();
                            successfulServers.Add(server);
                        }
                    }
                    catch (Exception) { /* ignored */ }
                }

                return successfulServers.ToArray();
            }
            catch (Exception) { /* ignored */ }
            
            return successfulServers.ToArray();
        }
    }
}