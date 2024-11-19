import ReactionError from "@reactioncommerce/reaction-error";
import Logger from "@reactioncommerce/logger";

const getRiderActivity = async (parent, params, context, info) => {
  const { user, collections } = context;
  const { RiderActivityData } = collections;
  const { id: activityId } = params;

  Logger.info("user: ", user);
  Logger.info("activityId: ", activityId);

  const dbActivity = await RiderActivityData.findOne({
    _id: activityId,
  });

  Logger.info("dbActivity:", dbActivity);

  if (!dbActivity) {
    throw new ReactionError("Not-Found", "Activity not found for this rider!");
  }

  return dbActivity || null;
};

export default getRiderActivity;
