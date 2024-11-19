// import ObjectID from "mongodb";
const { ObjectId } = await import("mongodb");
import {
  startOfToday,
  setHours,
  isBefore,
  isAfter,
  addHours,
  format,
} from "date-fns";
import Random from "@reactioncommerce/random";
import decodeOpaqueId from "@reactioncommerce/api-utils/decodeOpaqueId.js";
import ReactionError from "@reactioncommerce/reaction-error";
import Logger from "@reactioncommerce/logger";
import { decodeOrderOpaqueId } from "../xforms/id.js";
import getPaginatedResponse from "@reactioncommerce/api-utils/graphql/getPaginatedResponse.js";
import wasFieldRequested from "@reactioncommerce/api-utils/graphql/wasFieldRequested.js";
import calculateDeliveryTIme from "../utils/calculateDeliveryTIme.js";
import seedrandom from "seedrandom";
import { ACTIVITY_STATUSES } from "../costants/constant.js";
import { generateUUID } from "../utils/uuidGenerator.js";
// import Random from "@reactioncommerce/random";

// import Random from "@reactioncommerce/random";

export default {
  Mutation: {
    async saveActivityData(
      parent,
      { activity, time, duration, reason },
      context,
      info
    ) {
      const now = new Date();
      let CustomerOrder;
      // console.log("here first", orders);
      // console.log("Random id ", Random.id());
      const { userId, appEvents, collections } = context;
      // Get the current date
      // Use the current date to seed the random number generator
      // Get the current date
      // Get the current date
      var current_date = new Date();
      // Get the timestamp
      var timestamp = current_date.getTime();

      // console.log("Timestamp:", timestamp);

      if (context.user === undefined || context.user === null) {
        throw new ReactionError(
          "access-denied",
          "Unauthorized access. Please Login First"
        );
      }
      try {
        // console.log("orders ", orders);
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        const { ActivityData } = collections;
        const CurrentRiderID = context?.user?.id;
        const AllOrdersArray = [];

        const riderStatus = await Accounts.findOne({
          _id: orders[0].riderID,
        });
        // console.log("Status of Rider : ", riderStatus);

        if (riderStatus && riderStatus?.currentStatus === "offline") {
          throw new ReactionError(
            "not-found",
            "Rider is offline, cannot create order"
          );
        }
        // for (const orderItem of orders) {
        //   // console.log("orderCount", orderCount);
        //   // createdAt: {
        //   //   $gte: todayStart,
        //   //   $lt: todayEnd,
        //   // },
        // }
        const RiderIDForAssign1 = orders.map((order) => {
          const riderId = order.riderID ? order.riderID : CurrentRiderID;
          return {
            ...order,
            riderID: riderId,
            createdAt: now,
          };
        });
        const riderID = RiderIDForAssign1[0].riderID;
        const existingOrders1 = await RiderOrder.find({
          riderID: riderID,
          OrderStatus: { $nin: ["delivered", "canceled"] }, // OrderStatus: { $ne: "delivered" },
        }).toArray();
        // console.log("testing");
        // console.log("existingOrders1 ", existingOrders1.length);
        // console.log("existingOrders1 ", existingOrders1);
        if (existingOrders1.length > 1) {
          // console.log("testig 2");
          throw new ReactionError(
            "access-denied",
            "Cannot assign new orders. Complete previous order first."
          );
        }
        // console.log("inside else statement");
        const insertedOrders = [];
        for (const order of orders) {
          var current_date = new Date();
          // Get the timestamp
          var timestamp = current_date.getTime();
          CustomerOrder = await Orders.findOne({ _id: order?.OrderID });
          let CustomerAccountID = "";
          if (CustomerOrder) {
            CustomerAccountID = CustomerOrder?.accountId;
            let updateOrders = {
              $set: { "workflow.status": "pickedUp", updatedAt: new Date() },
            };
            const options = { new: true };
            await Orders.findOneAndUpdate(
              { _id: order?.OrderID },
              updateOrders,
              options
            );
          }
          // console.log("order id", order.OrderID);
          // console.log(/^\d+$/.test(order.OrderID));
          var OrderID = order.OrderID;
          if (/^\d+$/.test(order.OrderID)) {
            OrderID = timestamp + "-" + OrderID;
          }
          // console.log("Order ID", OrderID);
          order.OrderID = OrderID;
          const RiderIDForAssign = {
            ...order,
            riderID: order.riderID ? order.riderID : CurrentRiderID,
            createdAt: now,
          };
          order.createdAt = new Date();
          order.updatedAt = new Date();
          let riderOrderResp = await RiderOrder.insertOne(order);
          // console.log("riderOrderResp", riderOrderResp.ops[0]);
          if (riderOrderResp?.ops?.length >= 1) {
            insertedOrders.push(riderOrderResp.ops[0]);
          }
          // await RiderOrderHistory.insertOne(order);
          await appEvents.emit("afterCreatingRiderOrder", {
            createdBy: userId,
            order,
            CustomerAccountID,
            CustomerOrder,
          });
        }
        // console.log("insertedOrders", insertedOrders);
        return insertedOrders;
      } catch (error) {
        console.log("error ", error);
        throw new ReactionError("access-denied", `${error}`);
      }
    },

    async upsertRiderActivity(parent, params, context, info) {
      try {
        const { status = null, outBranchReason = "" } = params.input;
        const { user = null, collections } = context;
        const { UserRole, _id: riderId } = user;
        const { RiderActivityData } = collections;
        Logger.info("mutations: ", context.mutations);

        // Check if the user is logged in
        if (!user) {
          throw new ReactionError(
            "access-denied",
            "Unauthorized access. Please Login First"
          );
        }

        // Validate user role
        if (user?.UserRole !== "rider") {
          throw new ReactionError(
            "access-denied",
            "You are not authorized for this operation!"
          );
        }

        // Get current time to ensure it's within the rider's duty hours
        const currentTime = new Date(); // Get current time
        const riderDutyStart = setHours(startOfToday(), 1); // 1:00 AM UTC+0
        const riderDutyEnd = setHours(startOfToday(), 23, 30); // 11:30 PM UTC+0

        // Adjust for UTC+5
        const timeZoneOffset = 5 * 60 * 60 * 1000; // UTC+5
        const adjustedDutyStart = new Date(
          riderDutyStart.getTime() + timeZoneOffset
        );
        const adjustedDutyEnd = new Date(
          riderDutyEnd.getTime() + timeZoneOffset
        );

        if (
          isBefore(currentTime, adjustedDutyStart) ||
          isAfter(currentTime, adjustedDutyEnd)
        ) {
          throw new ReactionError(
            "access-denied",
            "Outside of duty hours (9:00 AM to 11:30 PM UTC+5)"
          );
        }

        // Validate activity state
        if (!ACTIVITY_STATUSES.includes(status)) {
          throw new ReactionError("invalid-input", "Invalid activity status");
        }

        // Check if a record for this rider already exists for today based on `createdAt`
        const startOfTodayDate = startOfToday();

        const activity = await RiderActivityData.findOne({
          riderId: riderId,
          createdAt: { $gte: startOfTodayDate }, // Checking if a record exists for today
        });

        Logger.info("activity 1: ", activity);

        if (activity) {
          const lastStatusTime = new Date(activity.currentStatus.timestamp); // Convert to Date
          const duration = currentTime.getTime() - lastStatusTime.getTime(); // duration in milliseconds

          // Calculate the duration in seconds (optional)
          const durationInSeconds = duration / 1000;

          switch (activity.currentStatus.status) {
            case "IN_BRANCH":
              activity.totalDuration.totalInBranch += durationInSeconds;
              break;
            case "OUT_BRANCH":
              activity.totalDuration.totalOutBranch += durationInSeconds;
              activity.outBranchLogs.push({
                startTime: lastStatusTime,
                endTime: currentTime, // Store as Date object
                reason: outBranchReason || "No reason provided",
              });
              break;
            case "DELIVERY":
              activity.totalDuration.totalDeliveryDuration += durationInSeconds;
              break;
            case "OTHER":
              activity.totalDuration.totalOtherDuration += durationInSeconds;
              break;
          }

          // Update the lastStatus to the current one
          activity.lastStatus = {
            status: activity.currentStatus.status,
            timestamp: lastStatusTime, // Store as Date object
          };

          // Update current status
          activity.currentStatus = {
            status,
            timestamp: currentTime, // Store as Date object
          };

          // Save the updated activity back to the database
          const dbActivity = await RiderActivityData.findOneAndUpdate(
            { _id: activity?._id },
            { $set: activity },
            { new: true }
          );

          Logger.info("dbActivity.value: ", dbActivity.value);

          return dbActivity?.value;
        }

        // If no record exists for today, create a new one
        const newActivity = {
          _id: generateUUID(),
          riderId: riderId,
          currentStatus: {
            status,
            timestamp: currentTime, // Store as Date object
          },
          lastStatus: {
            status,
            timestamp: currentTime, // Store as Date object
          },
          totalDuration: {
            totalInBranch: 0,
            totalOutBranch: 0,
            totalDeliveryDuration: 0,
            totalOtherDuration: 0,
          },
          outBranchLogs: [],
          createdAt: new Date(), // Include createdAt field
        };

        // Insert the new activity into the database
        const result = await RiderActivityData.insertOne(newActivity);

        // Return the newly created activity
        return { ...newActivity, _id: result.insertedId }; // Include the inserted ID in the returned object
      } catch (error) {
        console.log("error ", error);
        throw new ReactionError("access-denied", `${error}`);
      }
    },
  },
  Query: {
    async getAttendanceReport(parent, { id }, context, info) {
      const { collections } = context;

      const { RiderOrder } = collections;
      // Logger.info(`Something important happened!: ${context?.user[0]}`);
      Logger.info("dffffffffftes", context.user);
      // return null;
      if (context.user === undefined || context.user === null) {
        throw new ReactionError(
          "access-denied",
          "Unauthorized access. Please Login First"
        );
      }
      try {
        const { ActivityData } = context.collections;
        if (id === null || id === undefined) {
          id = context.user.id;
        }
        console.log("id ", id);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        console.log("tomorrow ", tomorrow);
        let ordersResp = await RiderOrder.find({
          riderID: id,
          createdAt: {
            $gte: today,
            $lt: tomorrow,
          },
        })
          .sort({ createdAt: -1 })
          .toArray();
        // console.log("ordersResp ", ordersResp);
        // const ordersResp = await RiderOrder.find({
        //   riderID: new ObjectID.ObjectId(id),
        //   // createdAt: { $gte: today },
        // })
        //   .sort({ createdAt: -1 })
        //   .toArray();
        console.log("ordersResp ", ordersResp);
        if (ordersResp) {
          return ordersResp;
        } else {
          return null;
        }
      } catch (error) {
        console.log("error ", error);
        throw new ReactionError("access-denied", `${error}`);
      }
    },

    async getRiderActivity(parent, params, context, info) {
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
        throw new ReactionError(
          "Not-Found",
          "Activity not found for this rider!"
        );
      }

      return dbActivity || null;
    },
  },
};
