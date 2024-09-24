export default async function calculateDeliveryTIme(context, OrderID, endTime) {
    console.log("Order ID", OrderID);
    console.log("endTIme", endTime);
    let deliveryTime;
    const { collections } = context;
    const { RiderOrder } = collections;
    const getStartTimeResp = await RiderOrder.findOne({
        OrderID: OrderID,
    });
    if (getStartTimeResp) {
        const startFinalTime = new Date(getStartTimeResp.startTime);
        const endFinalTime = new Date(endTime);
        const timeDiff = endFinalTime.getTime() - startFinalTime.getTime();
        // timeDiff is in milliseconds, convert to seconds
        const minutes = timeDiff / 60000;
        deliveryTime = parseFloat(minutes.toFixed(2));
        return deliveryTime
    }
}