import ObjectID from "mongodb";
import Random from "@reactioncommerce/random";
import decodeOpaqueId from "@reactioncommerce/api-utils/decodeOpaqueId.js";
import ReactionError from "@reactioncommerce/reaction-error";
import { decodeOrderOpaqueId } from "../xforms/id.js";
import getPaginatedResponse from "@reactioncommerce/api-utils/graphql/getPaginatedResponse.js";
import wasFieldRequested from "@reactioncommerce/api-utils/graphql/wasFieldRequested.js";
import calculateDeliveryTIme from "../utils/calculateDeliveryTIme.js";
import seedrandom from "seedrandom";
// import Random from "@reactioncommerce/random";

// import Random from "@reactioncommerce/random";
export default {
  Mutation: {
    async saveActivityData(parent, { activity, time, duration, reason }, context, info) {
      const now = new Date();
      let CustomerOrder;
      // console.log("here first", orders);
      // console.log("Random id ", Random.id());
      const { userId, appEvents, collections } = context
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
        const { ActivityData } =
          collections;
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
          await appEvents.emit("afterCreatingRiderOrder", { createdBy: userId, order, CustomerAccountID, CustomerOrder });

        }
        // console.log("insertedOrders", insertedOrders);
        return insertedOrders;
      } catch (error) {
        console.log("error ", error);
        throw new ReactionError("access-denied", `${error}`);
      }
    },
  },
  Query: {
    async getAttendenceReport(parent, { id }, context, info) {
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
    async getRiderOrderHistory(parent, { input }, context, info) {
      let { startTime, endTime, OrderStatus, riderID } = input;
      if (context.user === undefined || context.user === null) {
        throw new ReactionError(
          "access-denied",
          "Unauthorized access. Please Login First"
        );
      }
      try {
        const { RiderOrder } = context.collections;
        if (riderID === null || riderID === undefined) {
          riderID = context.user.id;
        }
        let query = { riderID: riderID };
        if (startTime && endTime) {
          query.createdAt = {
            $gte: new Date(startTime),
            $lte: new Date(endTime),
          };
        }
        if (OrderStatus) {
          query.OrderStatus = OrderStatus;
        }
        // console.log("query",query)
        const ordersResponse = await RiderOrder.find(query)
          .sort({ createdAt: -1 })
          .toArray();
        if (ordersResponse) {
          return ordersResponse;
        } else {
          return null;
        }
      } catch (error) {
        console.log("error", error);
        throw new ReactionError("access-denied", `${error}`);
      }
    },
    async getOrderById(parent, { id }, context, info) {
      // console.log(context.user);
      if (context.user === undefined || context.user === null) {
        throw new ReactionError(
          "access-denied",
          "Unauthorized access. Please Login First"
        );
      }
      try {
        const { RiderOrder } = context.collections;
        if (id === null || id === undefined) {
          id = context.user.id;
        }
        const today = new Date(); // Get current date
        today.setHours(0, 0, 0, 0);
        const ordersResp = await RiderOrder.find({
          riderID: id,
          // createdAt: { $gte: today },
        })
          .sort({ updatedAt: -1 })
          .toArray();
        // console.log("ordersResp ", ordersResp);

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
    async getOrdersByStatus(parent, { OrderStatus }, context, info) {
      // console.log("context.user ", context.user);
      if (context.user === undefined || context.user === null) {
        throw new ReactionError(
          "access-denied",
          "Unauthorized access. Please Login First"
        );
      }
      try {
        // console.log(OrderStatus);
        // console.log(context.user.id);
        const LoginUserID = context.user.id;
        const { RiderOrder, Orders } = context.collections;
        // Get Order by status
        const orders = await RiderOrder.find({
          OrderStatus: OrderStatus,
        })
          .sort({ createdAt: -1 })
          .toArray();
        // console.log("orders ", orders);
        console.log("LoginUserID ", LoginUserID)

        if (orders) {
          // Current Login User Order
          const filteredOrders = orders.filter(
            (order) => order.riderID === LoginUserID
          );
          // console.log("Filter Order: ", filteredOrders);
          // console.log("Filter Order ID: ", filteredOrders[0].OrderID);
          console.log("filteredOrders.length ", filteredOrders.length)
          if (filteredOrders) {
            const ordersWithId = filteredOrders.map((order) => ({
              id: order._id,
              ...order,
            }));
            console.log("ordersWithId.length ", ordersWithId.length)
            // console.log("ordersWithId ", ordersWithId);
            return ordersWithId;
          } else {
            return null;
          }
          // if (filteredOrders[0]) {
          //   const kitchenOrderIDResp = await Orders.find({
          //     _id: filteredOrders[0].OrderID,
          //   })
          //     .sort({ createdAt: -1 })
          //     .toArray();
          //   console.log("kitchenOrderID: ", kitchenOrderIDResp);
          //   if (kitchenOrderIDResp[0]) {
          //     const ordersWithId = filteredOrders.map((order) => ({
          //       id: order._id,
          //       ...order,
          //       kitchenOrderID: kitchenOrderIDResp[0]?.kitchenOrderID,
          //     }));
          //     return ordersWithId;
          //   } else {
          //     const ordersWithId = filteredOrders.map((order) => ({
          //       id: order._id,
          //       ...order,
          //     }));
          //     return ordersWithId;
          //   }
          //   // const OrderWithkitchenOrderID =
          //   // console.log("Order with ID: ", ordersWithId);
          // } else {
          //   return null;
          // }
        } else {
          return null;
        }
      } catch (error) {
        console.log("error ", error);
        throw new ReactionError("access-denied", `${error}`);
      }
    },
    async getOrdersByStatusOptimized(parent, { OrderStatus }, context, info) {
      if (context.user === undefined || context.user === null) {
        throw new ReactionError(
          "access-denied",
          "Unauthorized access. Please Login First"
        );
      }

      try {
        const LoginUserID = context.user.id;
        const { RiderOrder } = context.collections;

        // Aggregate directly on RiderOrder
        const ordersResp = await RiderOrder.aggregate([
          {
            $match: {
              OrderStatus: OrderStatus,
              riderID: LoginUserID,
            },
          },
          { $sort: { createdAt: -1 } },
          {
            $lookup: {
              from: "Accounts",
              localField: "riderID",
              foreignField: "_id",
              as: "riderInfo",
            },
          },
          { $unwind: { path: "$riderInfo", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: "Orders",
              localField: "OrderID",
              foreignField: "_id",
              as: "orderInfo",
            },
          },
          { $unwind: { path: "$orderInfo", preserveNullAndEmptyArrays: true } }, // Preserve documents even if riderOrderInfo is missing
          {
            // Convert branchID to ObjectId and lookup in BranchData
            $addFields: {
              branchObjectId: { $toObjectId: "$orderInfo.branchID" }, // Convert branchID string to ObjectId
            },
          },
          {
            $lookup: {
              from: "BranchData", // The collection where branch information is stored
              localField: "branchObjectId", // Use the converted ObjectId field
              foreignField: "_id", // Field in BranchData that matches the branchID
              as: "branchDetails",
            },
          },
          { $unwind: { path: "$branchDetails", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              id: "$_id",
              OrderID: "$OrderID",
              status: "$orderInfo.workflow.status",
              startTime: "$startTime",
              endTime: "$endTime",
              createdAt: "$orderInfo.createdAt",
              updatedAt: "$orderInfo.updatedAt",
              branchID: "$orderInfo.branchID",
              summary: {
                discountTotal: {
                  amount: { $sum: "$discounts.amount" },
                  __typename: "DiscountTotal",
                },
                __typename: "Summary",
              },
              payments: {
                $map: {
                  input: "$orderInfo.payments",
                  as: "payment",
                  in: {
                    finalAmount: "$$payment.finalAmount",
                    tax: "$$payment.tax",
                    totalAmount: "$$payment.totalAmount",
                    billingAddress: {
                      fullName: "$$payment.address.fullName",
                      phone: "$$payment.address.phone",
                      address1: "$$payment.address.address1",
                      city: "$$payment.address.city",
                      country: "$$payment.address.country",
                      postal: "$$payment.address.postal",
                      region: "$$payment.address.region",
                    },
                    __typename: "Payments",
                  },
                },
              },
              email: 1,
              kitchenOrderID: 1,
              // Ensure kitchenOrderIDInfo is null if the value is null or missing
              kitchenOrderIDInfo: {
                $cond: {
                  if: { $or: [{ $eq: ["$orderInfo", null] }, { $eq: ["$orderInfo.kitchenOrderID", null] }] },
                  then: null,
                  else: { kitchenOrderID: "$orderInfo.kitchenOrderID" }
                }
              },
              customerOrderTime: {
                customerOrderTime: "$orderInfo.createdAt",
              },
              riderOrderNotes: "$riderOrderNotes",
              riderOrderAmount: "$riderOrderAmount",
              branches: "$branches",
              username: "$riderInfo.name",
              OrderStatus: "$OrderStatus",
              riderOrderInfo: {
                _id: "$_id",
                startTime: "$startTime",
                endTime: "$endTime",
                __typename: "RiderOrderInfo",
              },
              riderInfo: {
                userId: "$riderInfo.userId",
                _id: "$riderInfo._id",
                firstName: "$riderInfo.profile.firstName",
                lastName: "$riderInfo.profile.lastName",
                phone: "$riderInfo.profile.phone",
                __typename: "RiderInfo",
              },
              fulfillmentGroups: {
                $map: {
                  input: "$orderInfo.shipping",
                  as: "shippingItem",
                  in: {
                    selectedFulfillmentOption: {
                      fulfillmentMethod: {
                        fulfillmentTypes: ["$$shippingItem.type"],
                        __typename: "FulfillmentMethod",
                      },
                      __typename: "FulfillmentOption",
                    },
                    items: {
                      nodes: {
                        $map: {
                          input: "$$shippingItem.items",
                          as: "item",
                          in: {
                            _id: "$$item._id",
                            quantity: "$$item.quantity",
                            optionTitle: "$$item.optionTitle",
                            title: "$$item.title",
                            variantTitle: "$$item.variantTitle",
                            attributes: {
                              $map: {
                                input: "$$item.attributes",
                                as: "attribute",
                                in: {
                                  label: "$$attribute.label",
                                  value: "$$attribute.value",
                                  __typename: "OrderItemAttribute",
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              notes: "$orderInfo.notes",
              deliveryTime: 1,
              branchTimePickup: {
                branchOrderTime: "$createdAt",
                __typename: "BranchTimePickup",
              },
              customerInfo: {
                address1: { $arrayElemAt: ["$orderInfo.shipping.address.address1", 0] },
                city: { $arrayElemAt: ["$orderInfo.shipping.address.city", 0] },
                country: { $arrayElemAt: ["$orderInfo.shipping.address.country", 0] },
                postal: { $arrayElemAt: ["$orderInfo.shipping.address.postal", 0] },
                region: { $arrayElemAt: ["$orderInfo.shipping.address.region", 0] },
                phone: { $arrayElemAt: ["$orderInfo.shipping.address.phone", 0] },
                fullName: { $arrayElemAt: ["$orderInfo.shipping.address.fullName", 0] },
                __typename: "CustomerInfo",
              },
              branchInfo: {
                _id: "$branchDetails._id",
                name: "$branchDetails.name",
                __typename: "BranchInfo",
              },
            }
          }

        ]).toArray();
        console.log("ordersResp ", ordersResp)
        // console.log("ordersResp.length ", ordersResp.length);
        // console.log("ordersResp[0].fulfillmentGroups ",ordersResp[0].fulfillmentGroups)
        return ordersResp;
      } catch (error) {
        console.log("error ", error);
        throw new ReactionError("access-denied", `${error}`);
      }
    },
    async generateOrderReport(parent, args, context, info) {
      // console.log("args ", args);
      // console.log("info", info);
      let { authToken, userId, collections } = context;
      let { RiderOrder } = collections;
      if (context.user === undefined || context.user === null) {
        throw new ReactionError(
          "access-denied",
          "Unauthorized access. Please Login First"
        );
      }

      try {
        let {
          isManual,
          searchQuery,
          riderID,
          branches,
          startTime,
          OrderID,
          endTime,
          fromDate,
          toDate,
          deliveryTime,
          ...connectionArgs
        } = args;
        // console.log("args ", args);
        let query = {};
        let matchStage = [];
        if (isManual === false) {
          query.isManual = false;
          matchStage.push({ isManual: false });
        }
        if (isManual === true) {
          query.isManual = true;
          matchStage.push({ isManual: true });
        }
        if (riderID) {
          query.riderID = riderID;
          matchStage.push({ riderID: riderID });
        }
        if (branches) {
          query.branches = branches;
          matchStage.push({ branches: branches });
        }
        // if (deliveryTime) {
        //   query.deliveryTime = deliveryTime;
        //   matchStage.push({ deliveryTime: deliveryTime });
        // }
        if (deliveryTime) {
          query.deliveryTime = { $lt: deliveryTime };
          matchStage.push({ deliveryTime: { $lt: deliveryTime } });
        }

        if (startTime) {
          const start = new Date(startTime); // Fix variable name
          query.startTime = {
            $gte: start,
          };
          matchStage.push({ $match: { startTime: { $gte: start } } });
        }
        if (endTime) {
          query.endTime = {
            $lte: new Date(endTime),
          };
          matchStage.push({
            $match: { startTime: { $lte: new Date(endTime) } },
          });
        }
        if (OrderID) {
          query.OrderID = OrderID;
          matchStage.push({ OrderID: OrderID });
        }
        if (fromDate && fromDate !== undefined) {
          query.createdAt = {
            ...query.createdAt,
            $gte: new Date(fromDate),
          };
          matchStage.push({
            $match: { createdAt: { $gte: new Date(fromDate) } },
          });
        }
        if (toDate && toDate !== undefined) {
          query.createdAt = {
            ...query.createdAt,
            $lte: new Date(toDate),
          };
          matchStage.push({
            $match: { createdAt: { $lte: new Date(toDate) } },
          });
        }
        if (searchQuery) {
          const regexQuery = new RegExp(searchQuery, "i");
          query.$or = [
            { OrderID: { $regex: regexQuery } },
            { OrderStatus: { $regex: regexQuery } },
            // { OrderID: { $in: matchingOrderIDs } },
          ];
        }
        // console.log("query", query);
        const report = await RiderOrder.find(query);
        // const report = await RiderOrder.find([{ $match: { $and: matchStage } }]);
        return getPaginatedResponse(report, connectionArgs, {
          includeHasNextPage: wasFieldRequested("pageInfo.hasNextPage", info),
          includeHasPreviousPage: wasFieldRequested(
            "pageInfo.hasPreviousPage",
            info
          ),
          includeTotalCount: wasFieldRequested("totalCount", info),
        });
      } catch (error) {
        console.log("error ", error);
        throw new ReactionError("access-denied", `${error}`);
      }
    },
    async getRiderOrdersByLoginRider(parent, args, context, info) {
      if (context.user === undefined || context.user === null) {
        throw new ReactionError(
          "access-denied",
          "Unauthorized access. Please Login First"
        );
      }
      try {
        const { startDate, endDate, riderID } = args;
        const { RiderOrder } = context.collections;
        const { id } = context.user;
        const orders = await RiderOrder.find({ riderID: riderID })
          .sort({ createdAt: -1 })
          .toArray();
        const today = new Date().toISOString().substring(0, 10);
        // filter data array to include only items with today's date in startTime
        const filteredData = orders.filter((item) => {
          if (!item.createdAt) {
            return false;
          }
          const itemDate = item.createdAt.substring(0, 10);
          return itemDate === today;
        });
        return filteredData;
      } catch (error) {
        console.log("error ", error);
        throw new ReactionError("access-denied", `${error}`);
      }
    },
    async getKitchenReport(parent, args, context, info) {
      const { startDate, endDate, branchID, OrderStatus } = args;
      if (context.user === undefined || context.user === null) {
        throw new ReactionError(
          "access-denied",
          "Unauthorized access. Please Login First"
        );
      }
      try {
        const { BranchData, Orders } = context.collections;
        const query = {};
        // query._id = "gaEncZjXwfkRPcwif";
        if (branchID) {
          query.branchID = branchID;

        }
        if (OrderStatus) {
          query["workflow.status"] = args.OrderStatus;
        }
        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          query.createdAt = {
            $gte: start,
            $lte: end,
          };
        }
        const ordersResp = await Orders.find(query)
          .sort({ createdAt: -1 })
          .toArray();
        // console.log(ordersResp.length);
        // console.log()
        // return

        const ordersWithId = ordersResp.map((order) => ({
          id: order._id,
          ...order,
        }));
        return ordersWithId;
      } catch (error) {
        console.log("error ", error);
        throw new ReactionError("access-denied", `${error}`);
      }
    },
    async getKitchenReportOptimized(parent, args, context, info) {
      const { startDate, endDate, branchID, OrderStatus, type } = args;
      if (context.user === undefined || context.user === null) {
        throw new ReactionError(
          "access-denied",
          "Unauthorized access. Please Login First"
        );
      }
      try {
        const { Orders } = context.collections;
        const query = {};
        const filterStatus = []
        if (type == "kitchenOrders") {
          filterStatus.push("new", "processing", "ready", "pickedUp", "picked")
        } else if (type == "completed") {
          filterStatus.push("delivered", "complete", "canceled")
        }
        console.log("filterStatus ", filterStatus)
        // let statuses=await Orders.distinct("workflow.status")
        // console.log("statuses ",statuses)
        // query._id = "gaEncZjXwfkRPcwif"; // Example _id
        if (branchID) {
          query.branchID = branchID;
        }
        if (filterStatus && filterStatus.length > 0) {
          query["workflow.status"] = {
            $in: filterStatus
          }
        }
        if (OrderStatus) {
          query["workflow.status"] = args.OrderStatus;
        }
        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          query.createdAt = {
            $gte: start,
            $lte: end,
          };
        }
        console.log("query ", query)

        const ordersResp = await Orders.aggregate([
          { $match: query },
          { $sort: { createdAt: -1 } },
          {
            $lookup: {
              from: "RiderOrder",
              localField: "_id",
              foreignField: "OrderID",
              as: "riderOrderInfo",
            },
          },
          { $unwind: { path: "$riderOrderInfo", preserveNullAndEmptyArrays: true } }, // Preserve documents even if riderOrderInfo is missing
          {
            $lookup: {
              from: "Accounts",
              localField: "riderOrderInfo.riderID",
              foreignField: "_id",
              as: "riderInfo",
            },
          },
          { $unwind: { path: "$riderInfo", preserveNullAndEmptyArrays: true } }, // Preserve documents even if riderInfo is missing
          {
            // Convert branchID to ObjectId and lookup in BranchData
            $addFields: {
              branchObjectId: { $toObjectId: "$branchID" }, // Convert branchID string to ObjectId
            },
          },
          {
            $lookup: {
              from: "BranchData", // The collection where branch information is stored
              localField: "branchObjectId", // Use the converted ObjectId field
              foreignField: "_id", // Field in BranchData that matches the branchID
              as: "branchDetails",
            },
          },
          { $unwind: { path: "$branchDetails", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              id: "$_id",
              _id: 1,
              startTime: "$riderOrderInfo.startTime",
              endTime: "$riderOrderInfo.endTime",
              createdAt: 1,
              updatedAt: 1,
              branchID: 1,
              summary: {
                discountTotal: {
                  amount: { $sum: "$discounts.amount" },
                  __typename: "DiscountTotal",
                },
                __typename: "Summary",
              },
              payments: {
                $map: {
                  input: "$payments",
                  as: "payment",
                  in: {
                    finalAmount: "$$payment.finalAmount",
                    tax: "$$payment.tax",
                    totalAmount: "$$payment.totalAmount",
                    billingAddress: {
                      fullName: "$$payment.address.fullName",
                      phone: "$$payment.address.phone",
                      address1: "$$payment.address.address1",
                      city: "$$payment.address.city",
                      country: "$$payment.address.country",
                      postal: "$$payment.address.postal",
                      region: "$$payment.address.region",
                    },
                    __typename: "Payments",
                  },
                },
              },
              email: 1,
              kitchenOrderID: 1,
              status: "$workflow.status",
              branches: "$riderOrderInfo.branches",
              username: "$riderInfo.name",
              OrderStatus: "$riderOrderInfo.OrderStatus",
              riderOrderInfo: {
                _id: "$riderOrderInfo._id",
                startTime: "$riderOrderInfo.startTime",
                endTime: "$riderOrderInfo.endTime",
                __typename: "RiderOrderInfo",
              },
              riderInfo: {
                userId: "$riderInfo.userId",
                _id: "$riderInfo._id",
                firstName: "$riderInfo.profile.firstName",
                lastName: "$riderInfo.profile.lastName",
                phone: "$riderInfo.profile.phone",
                __typename: "RiderInfo",
              },
              fulfillmentGroups: {
                $map: {
                  input: "$shipping", // Map the shipping field
                  as: "shippingItem",
                  in: {
                    selectedFulfillmentOption: {
                      fulfillmentMethod: {
                        fulfillmentTypes: ["$$shippingItem.type"], // Correct
                        __typename: "FulfillmentMethod",
                      },
                      __typename: "FulfillmentOption",
                    },
                    items: {
                      nodes: {
                        $map: {
                          input: "$$shippingItem.items",
                          as: "item",
                          in: {
                            _id: "$$item._id",
                            quantity: "$$item.quantity",
                            optionTitle: "$$item.optionTitle",
                            title: "$$item.title",
                            variantTitle: "$$item.variantTitle",
                            attributes: {
                              $map: {
                                input: "$$item.attributes",
                                as: "attribute",
                                in: {
                                  label: "$$attribute.label",
                                  value: "$$attribute.value",
                                  __typename: "OrderItemAttribute",
                                },
                              },
                            },
                            // __typename: "OrderItem",
                          },
                        },
                        // __typename: "OrderItemConnection",
                      },
                    },
                    // __typename: "OrderFulfillmentGroup",
                  },
                },
                // __typename: "OrderFulfillmentGroups",
              },
              notes: {
                content: { $arrayElemAt: ["$notes.content", 0] }, // Access first element using $arrayElemAt
                createdAt: { $arrayElemAt: ["$notes.createdAt", 0] }, // Access first createdAt element using $arrayElemAt
                __typename: "Notes",
              },
              deliveryTime: 1,
              branchTimePickup: {
                branchOrderTime: "$riderOrderInfo.startTime",
                __typename: "BranchTimePickup",
              },
              customerInfo: {
                address1: { $arrayElemAt: ["$shipping.address.address1", 0] }, // Ensure address1 is treated as a string
                __typename: "CustomerInfo",
              },
              branchInfo: {
                _id: "$branchID",
                name: "$branchDetails.name", // Use the name from branchDetail
                __typename: "BranchInfo",
              },
            },
          },
        ]).toArray();

        // console.log(ordersResp);
        // console.log(ordersResp[0]);
        // console.log("Random.id(), ", Random.id())
        // const ordersWithId = ordersResp.map((order) => ({
        //   _id: Random.id(),
        //   ...order,
        // }));
        // console.log(ordersWithId.length);
        // console.log(ordersWithId[0]);
        return ordersResp;
      } catch (error) {
        console.log("error ", error);
        throw new ReactionError("access-denied", `${error}`);
      }
    },
    async getCustomerOrderbyID(parent, args, context, info) {
      if (context.user === undefined || context.user === null) {
        throw new ReactionError(
          "access-denied",
          "Unauthorized access. Please Login First"
        );
      }
      try {
        const { Orders } = context.collections;
        const { ID } = args;
        const CustomerOrderResp = await Orders.findOne({
          _id: decodeOpaqueId(ID).id,
        });
        return CustomerOrderResp;
      } catch (error) {
        console.log("error ", error);
        throw new ReactionError("access-denied", `${error}`);
      }
    },
    async generateKitchenReport(parent, args, context, info) {
      try {
        let { authToken, userId, collections } = context;
        const {
          startDate,
          endDate,
          branchID,
          OrderStatus,
          searchQuery,
          ...connectionArgs
        } = args;
        if (context.user === undefined || context.user === null) {
          throw new ReactionError(
            "access-denied",
            "Unauthorized access. Please Login First"
          );
        }
        // console.log("here on testing ");
        const { BranchData, Orders } = collections;
        const query = {};
        let matchStage = [];
        if (branchID) {
          // query.branchID = branchID;
          matchStage.push({ branchID: branchID });
        }
        if (OrderStatus) {
          // query["workflow.status"] = OrderStatus;
          matchStage.push({ "workflow.status": OrderStatus });
        }
        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          // query.createdAt = {
          //   $gte: start,
          //   $lte: end,
          // };
          matchStage.push({
            createdAt: {
              $gte: start,
              $lte: end,
            },
          });
        }
        if (searchQuery) {
          const matchingOrderIDs = await collections.Orders.distinct("_id", {
            $or: [
              {
                "shipping.0.address.address1": {
                  $regex: new RegExp(searchQuery, "i"),
                },
              },
              {
                "shipping.0.address.city": {
                  $regex: new RegExp(searchQuery, "i"),
                },
              },
            ],
          });
          const matchingIDs = [...matchingOrderIDs];
          // Adding the combined IDs to the matchStage
          console.log("matching ids are", matchingIDs);
          matchStage.push({
            _id: { $in: matchingIDs },
          });
        }
        let ordersResp = await Orders.find({ $and: matchStage });
        return getPaginatedResponse(ordersResp, connectionArgs, {
          includeHasNextPage: wasFieldRequested("pageInfo.hasNextPage", info),
          includeHasPreviousPage: wasFieldRequested(
            "pageInfo.hasPreviousPage",
            info
          ),
          includeTotalCount: wasFieldRequested("totalCount", info),
        });
      } catch (error) {
        console.log("error ", error);
        throw new ReactionError("access-denied", `${error}`);
      }
    },
    async getRiderReport(parent, args, context, info) {
      // console.log("args", info);
      try {
        let { collections } = context;
        if (context.user === undefined || context.user === null) {
          throw new ReactionError(
            "access-denied",
            "Unauthorized access. Please Login First"
          );
        }
        console.log("context.user ", context.user.UserRole);
        if (
          context.user.UserRole === "admin" ||
          context.user.UserRole === "dispatcher"
        ) {
          const { RiderOrder } = collections;
          let {
            branchId,
            riderID,
            startDate,
            endDate,
            itemPerPage,
            PageNumber,
          } = args;
          let itemsPerPage = itemPerPage ? itemPerPage : 10; // Number of items to display per page
          PageNumber = PageNumber ? PageNumber : 1;
          let skipAmount = (PageNumber - 1) * itemsPerPage;
          let pageCount = await RiderOrder.countDocuments({
            riderID: { $exists: true },
          });
          // console.log("pageCount", pageCount);
          // console.log("data1", pageCount / 10);
          // console.log("skipAmount ", skipAmount);
          // console.log("itemsPerPage", itemsPerPage);
          var matchStage = {};
          let query = [];
          matchStage = {
            $match: {
              riderID: { $exists: true },
              // createdAt: {
              //   // assuming your order has a createdAt field
              //   $gte: new Date(startDate),
              //   $lte: new Date(endDate),
              // },
            },
          };
          query.push(matchStage);
          if (startDate && endDate) {
            matchStage = {
              $match: {
                createdAt: {
                  $gte: new Date(startDate),
                  $lte: new Date(endDate),
                },
              },
            };
            query.push(matchStage);
          }

          if (branchId) {
            matchStage = {
              $match: {
                branches: branchId,
              },
            };
            query.push(matchStage);
          }
          if (riderID) {
            matchStage = {
              $match: {
                riderID: riderID,
              },
            };
            query.push(matchStage);
          }
          // console.log("query", query);

          let data = await RiderOrder.aggregate([
            ...query,
            // {
            //   $match: {
            //     riderOrderAmount: { $exists: true, $type: "number" },
            //   },
            // },
            {
              $group: {
                _id: "$riderID",
                totalOrders: { $sum: 1 },
                averageDeliveryTime: { $avg: "$deliveryTime" },
                cancelOrders: {
                  $sum: {
                    $cond: [{ $eq: ["$OrderStatus", "canceled"] }, 1, 0],
                  },
                },
                completeOrder: {
                  $sum: {
                    $cond: [{ $eq: ["$OrderStatus", "delivered"] }, 1, 0],
                  },
                },
                completeInTimeOrder: {
                  $sum: {
                    $cond: [
                      { $and: [{ $eq: ["$OrderStatus", "delivered"] }, { $lte: ["$deliveryTime", 25] }] },
                      1,
                      0
                    ]
                  }
                },

                //  {
                //   $sum: { $cond: [{ $lte: ["$deliveryTime", 25] }, 1, 0] },
                // },
                totalActiveTime: {
                  $sum: { $subtract: ["$endTime", "$startTime"] },
                },
                totalEarning: {
                  $sum: {
                    $cond: [
                      { $eq: ["$OrderStatus", "delivered"] },
                      "$riderOrderAmount",
                      0,
                    ],
                  },
                },
                // totalEarning: { $sum: "$riderOrderAmount" },
                totalManualOrders: { $sum: { $cond: ["$isManual", 1, 0] } },
                totalCustomerOrders: {
                  $sum: { $cond: ["$isManual", 0, 1] },
                },
              },
            },
            {
              $sort: { createdAt: -1 },
            },
            {
              $addFields: {
                totalActiveTime: {
                  $let: {
                    vars: {
                      hours: {
                        $trunc: { $divide: ["$totalActiveTime", 3600000] },
                      },
                      minutes: {
                        $trunc: {
                          $divide: [
                            { $mod: ["$totalActiveTime", 3600000] },
                            60000,
                          ],
                        },
                      },
                    },
                    in: {
                      $concat: [
                        { $toString: "$$hours" },
                        "h ",
                        { $toString: "$$minutes" },
                        "m",
                      ],
                    },
                  },
                },
                averageDeliveryTime: {
                  $round: ["$averageDeliveryTime", 2],
                },
              },
            },
            {
              $project: {
                account: 0,
              },
            },
            {
              $skip: skipAmount,
            },
            {
              $limit: itemsPerPage,
            },
          ]).toArray();
          // console.log("data", data);
          // console.log("data", data);
          if (data.length > 0) {
            return {
              RiderReport: data,
              totalPages: Math.round(pageCount / 100),
            };
          } else {
            return {
              RiderReport: [],
              totalPages: 0,
            };
          }
        } else {
          throw new ReactionError(
            "access-denied",
            "You are not authorize for this action"
          );
        }
      } catch (error) {
        console.log(error);
        throw new ReactionError("access-denied", `${error}`);
      }
    },
  },
};
