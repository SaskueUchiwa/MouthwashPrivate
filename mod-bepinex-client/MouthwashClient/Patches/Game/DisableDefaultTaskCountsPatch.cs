using HarmonyLib;
using Hazel;
using InnerNet;
using MouthwashClient.Enums;

namespace MouthwashClient.Patches.Game;

public class DisableDefaultTaskCountsPatch
{
    [HarmonyPatch(typeof(GameData), nameof(GameData.RecomputeTaskCounts))]
    public class DisableDefaultRecomputeTaskCountsPatch
    {
        public static bool Prefix(GameData __instance)
        {
            return false;
        }
    }

    [HarmonyPatch(typeof(GameData), nameof(GameData.CompleteTask))]
    public static class RemoveTaskIncrementPatch
    {
        public static bool Prefix(GameData __instance,
            [HarmonyArgument(0)] PlayerControl pc, [HarmonyArgument(1)] uint taskId)
        {
            GameData.TaskInfo taskInfo = pc.Data.FindTaskById(taskId);
            if (taskInfo == null)
            {
                return false;
            }
            if (!taskInfo.Complete)
            {
                taskInfo.Complete = true;
                return false;
            }
            return false;
        }
    }

    [HarmonyPatch(typeof(InnerNetClient), nameof(InnerNetClient.HandleMessage))]
    public static class CustomIntroMessageHandlePatch
    {
        public static bool Prefix(InnerNetClient __instance,
            [HarmonyArgument(0)] MessageReader reader, [HarmonyArgument(1)] SendOption sendOption)
        {
            switch (reader.Tag)
            {
                case (int)MouthwashRootPacketTag.SetTaskCounts:
                {
                    GameData.Instance.TotalTasks = reader.ReadInt32();
                    GameData.Instance.CompletedTasks = reader.ReadInt32();
                    return false;
                }
            }
            return true;
        }
    }
}