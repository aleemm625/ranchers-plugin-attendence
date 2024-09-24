import { createRequire } from "module";
// import importAsString from "@reactioncommerce/api-utils/importAsString.js";
const require = createRequire(import.meta.url);
var cron = require("node-cron");
import ObjectID from "mongodb";

export default async function executeCronJob(context) {
  const { CronJobs } = context.collections;
  let cronJobResp = await CronJobs.find({
    type: "orderFeedback",
    status: "delivered",
  }).toArray();

  cron.schedule("*/60 * * * *", () => {
    console.log("running a task every sixty minutes");
    cronJobResp.forEach(async (element) => {
      let message = "How was your order? Share your thoughts.";
      const RecordDate = element.createdAt;
      const CurrentDate = new Date();

      const date1 = new Date(RecordDate);
      const date2 = new Date(CurrentDate);

      // Calculate the time difference in milliseconds
      const timeDifferenceMs = Math.abs(date1 - date2);

      // Convert milliseconds to minutes
      const timeDifferenceMinutes = timeDifferenceMs / (1000 * 60);

      if (timeDifferenceMinutes > 60) {
        let paymentIntentClientSecret1 =
          await context.mutations.oneSignalCreateNotification(context, {
            message,
            id: element.userId,
            appType: "customer",
            userId: element.userId,
            orderID: element.orderId,
          });
        let delRecord = await CronJobs.drop({});
        console.log("delRecord ", delRecord);
        console.log(
          "Time difference is more than 60 minutes.i.e: ",
          timeDifferenceMinutes
        );
      } else {
        console.log(
          "Time difference is not more than 60 minutes.i.e: ",
          timeDifferenceMinutes
        );
      }
    });
    console.log("cron job end");
  });
}
