import ReactionError from "@reactioncommerce/reaction-error";
export default async function updateOrderStatus(OrderData, Status, Orders) {
 
    OrderData.map(async (order) => {
        const ordersFilter = { _id: order.RiderID };
        const options = { new: true }; // Return the updated document
        const updateOrders = { $set: { 'workflow.status': Status } };
        // Use find to get a cursor to the matching document
        const GetOrderData = await Orders.find({ _id: order.RiderID });
        // Get the first document from the cursor
        const orderToUpdate = await GetOrderData.next();
        if (!orderToUpdate) {
            throw new ReactionError(`No order found with ID = ${order.RiderID}`);
        }
        const updatedOrder = await Orders.findOneAndUpdate({ _id: order.RiderID }, updateOrders, options);
    });
}


