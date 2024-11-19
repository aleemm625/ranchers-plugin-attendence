import { startOfDay, endOfDay } from "date-fns";

import ReactionError from "@reactioncommerce/reaction-error";
import Logger from "@reactioncommerce/logger";
import { ACTIVITY_STATUSES } from "../../costants/constant.js";
import { generateUUID } from "../../utils/uuidGenerator.js";

const updateRiderStatus = async (parent, params, context, info) => {
  try {
    const { status = null } = params;
    const { user = null, collections } = context;
    const { UserRole, _id: riderId } = user;
    const { RiderActivityData } = collections;

    // Check if the user is logged in and has a rider role
    if (!user || UserRole !== "rider") {
      throw new ReactionError(
        "access-denied",
        "Unauthorized or Invalid User Role"
      );
    }

    // Validate activity status
    if (!ACTIVITY_STATUSES.includes(status)) {
      throw new ReactionError("invalid-input", "Invalid activity status");
    }

    const currentTime = new Date(); // Assuming currentTime is now
    const startTime = startOfDay(currentTime); // Start of the current day
    const endTime = endOfDay(currentTime); // End of the current day

    // Fetch the last activity of the rider
    const [lastActivity] = await RiderActivityData.find({
      riderId,
      createdAt: { $gte: startTime, $lte: endTime },
    })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();

    Logger.info("lastActivity: ", lastActivity);

    // If there is no record for the rider, insert a new document
    if (!lastActivity) {
      const newActivity = {
        _id: generateUUID(),
        riderId,
        status,
        outBranchReson: null,
        createdAt: currentTime,
        endedAt: null,
      };
      const result = await RiderActivityData.insertOne(newActivity);
      return { ...newActivity, _id: result.insertedId };
    }

    // If the last activity status matches the current status, return the last record
    if (lastActivity.status === status) {
      return lastActivity;
    }

    // Update the last activity's `endedAt` and create a new activity with the new status
    await RiderActivityData.updateOne(
      { _id: lastActivity._id },
      { $set: { endedAt: currentTime } }
    );

    const newActivity = {
      _id: generateUUID(),
      riderId,
      status,
      outBranchReson: null,
      createdAt: currentTime,
      endedAt: null,
    };
    const result = await RiderActivityData.insertOne(newActivity);

    return { ...newActivity, _id: result.insertedId };
  } catch (error) {
    Logger.error("updateRiderStatus error:", error);
    throw new ReactionError("access-denied", `${error.message || error}`);
  }
};

export default updateRiderStatus;
