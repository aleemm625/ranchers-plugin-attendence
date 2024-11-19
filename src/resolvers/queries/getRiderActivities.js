import { startOfDay, endOfDay } from "date-fns";
import ReactionError from "@reactioncommerce/reaction-error";
import Logger from "@reactioncommerce/logger";

const getRiderActivities = async (parent, params, context, info) => {
  const functionStart = Date.now();
  try {
    const { user, collections } = context;
    const { RiderActivityData } = collections;
    const { riderId, startDate, endDate } = params;

    const startOfDayDate = startOfDay(new Date(startDate));
    const endOfDayDate = endOfDay(new Date(endDate));

    const dbActivities = await RiderActivityData.find({
      riderId,
      createdAt: {
        $gte: startOfDayDate,
        $lte: endOfDayDate,
      },
    }).toArray();

    if (!dbActivities || dbActivities.length === 0) {
      throw new ReactionError(
        "Not-Found",
        "Activity not found for this rider!"
      );
    }

    return dbActivities;
  } catch (error) {
    Logger.error("getRiderActivities error:", error);
    throw new ReactionError("access-denied", `${error.message || error}`);
  }
};

export default getRiderActivities;
