import ReactionError from "@reactioncommerce/reaction-error";
import Logger from "@reactioncommerce/logger";
import { ACTIVITY_STATUS } from "../../costants/constant.js";
import { generateUUID } from "../../utils/uuidGenerator.js";

// steps:
// 1. params (activityId:uuid, outBranchReason:string)
// 2. check if activity exists
// 3. update activity

const updateRiderOutBranchReason = async (parent, params, context, info) => {
  try {
    const { activityId = null, outBranchReason = null } = params;
    const { user = null, collections } = context;
    const { UserRole, _id: riderId } = user;
    const { RiderActivityData } = collections;

    console.log("params", params);

    // Check if the user is logged in and has a rider role
    if (!user || UserRole !== "rider") {
      throw new ReactionError(
        "access-denied",
        "Unauthorized or Invalid User Role!"
      );
    }

    const activity = await RiderActivityData.findOne({ _id: activityId });

    console.log("activity", activity);

    if (!activity || activity?.status !== ACTIVITY_STATUS.OUT_BRANCH) {
      throw new ReactionError("not-found", "activity not found!");
    }

    await RiderActivityData.updateOne(
      { _id: activityId },
      { $set: { outBranchReason } }
    );

    const updatedActivity = await RiderActivityData.findOne({
      _id: activityId,
    });

    console.log("updatedActivity", updatedActivity);

    return updatedActivity;
  } catch (error) {
    Logger.error("updateRiderBranchOutReason error:", error);
    throw new ReactionError("access-denied", `${error.message || error}`);
  }
};

export default updateRiderOutBranchReason;
