using AmongUs.GameOptions;
using Reactor.Utilities.Attributes;

namespace MouthwashClient.Net
{
    [RegisterInIl2Cpp]
    public class MouthwashRole : RoleBehaviour
    {
        void Start()
        {
            Role = RoleTypes.Crewmate;
            TeamType = RoleTeamTypes.Crewmate;
        }

        public override bool IsDead => Player.Data.IsDead;
    }
}