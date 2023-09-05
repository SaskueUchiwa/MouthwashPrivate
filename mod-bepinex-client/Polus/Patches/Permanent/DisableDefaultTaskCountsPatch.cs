using HarmonyLib;
using Polus.Extensions;

namespace Polus.Patches.Permanent {
    [HarmonyPatch(typeof(GameData), nameof(GameData.RecomputeTaskCounts))]
    public class DisableDefaultTaskCountsPatch
    {
        [HarmonyPrefix]
        public static bool RecomputeTaskCounts(GameData __instance)
        {
            return false;
        }
    }

    [HarmonyPatch(typeof(GameData), nameof(GameData.CompleteTask))]
    public class CompleteTaskPatch
    {
        [HarmonyPrefix]
        public static bool CompleteTask(GameData __instance,
            [HarmonyArgument(0)] PlayerControl pc, [HarmonyArgument(1)] uint taskId)
        {
            GameData.TaskInfo taskInfo = pc.Data.FindTaskById(taskId);
            if (taskInfo == null)
            {
                $"Couldn't find task: {taskId.ToString()}".Log();
                return false;
            }
            if (!taskInfo.Complete)
            {
                taskInfo.Complete = true;
                return false;
            }
            $"Double complete task: {taskId.ToString()}".Log();
            return false;
        }
    }
}