using HarmonyLib;
using MouthwashClient.Services;
using Reactor.Utilities;

namespace MouthwashClient.Patches.Menu
{
    [HarmonyPatch(typeof(Reactor.Patches.ReactorVersionShower), nameof(Reactor.Patches.ReactorVersionShower.UpdateText))]
    public static class ReactorStampShowMouthwashInfoPatch
    {
        public static void Postfix()
        {
            if (Reactor.Patches.ReactorVersionShower.Text != null)
            {
                Reactor.Patches.ReactorVersionShower.Text.text += "\n<color=#8221cc>Polus.gg: Rewritten</color> 2.0.0";
                if (LoginService.IsLoggedIn())
                {
                    UserInformationWithAuthToken userInformation = LoginService.GetLoginInformation();
                    Reactor.Patches.ReactorVersionShower.Text.text += $"\nLogged in as {userInformation.DisplayName}";
                }
                else if (!string.IsNullOrEmpty(LoginService.ErrorWhileLoggingIn))
                {
                    Reactor.Patches.ReactorVersionShower.Text.text += $"\n<color=#c92d22>{LoginService.ErrorWhileLoggingIn}</color>";
                }
                else
                {
                    Reactor.Patches.ReactorVersionShower.Text.text += "\n<color=#c92d22>Not logged in</color>";
                }
            }
        }
    }
}