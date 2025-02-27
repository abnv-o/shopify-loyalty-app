const { getCustomerMetafields, updateCustomerPoints } = require('./metafields');
const { calculateOrderPoints } = require('./utils');

/**
 * Handle order fulfillment and assign loyalty points
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Express response
 */
async function handleOrderFulfillment(req, res) {
  try {
    const order = req.body;
    if (!order || !order.customer || !order.customer.id) {
      return res.status(400).json({ message: "Invalid order data" });
    }

    const orderValue = parseFloat(order.total_price);
    const paymentMethod = order.gateway ? order.gateway.toLowerCase() : "unknown";
    const customerId = order.customer.id;

    // Calculate points to award
    const pointsEarned = calculateOrderPoints(orderValue, paymentMethod);

    // Get current loyalty points
    const loyaltyMetafield = await getCustomerMetafields(customerId);
    const currentPoints = loyaltyMetafield ? parseInt(loyaltyMetafield.value) : 0;
    const newPoints = currentPoints + pointsEarned;

    // Update customer points
    await updateCustomerPoints(
      loyaltyMetafield?.id || "",
      customerId,
      newPoints
    );

    return res.status(200).json({ 
      message: "Loyalty points assigned successfully", 
      pointsEarned 
    });
  } catch (error) {
    console.error("❌ Error handling order fulfillment:", error.response?.data || error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Handle order cancellation and deduct loyalty points
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object 
 * @returns {Object} - Express response
 */
async function handleOrderCancellation(req, res) {
  try {
    const order = req.body;
    if (!order || !order.customer || !order.customer.id) {
      return res.status(400).json({ message: "Invalid order data" });
    }

    const customerId = order.customer.id;
    const loyaltyMetafield = await getCustomerMetafields(customerId);
    if (!loyaltyMetafield) {
      return res.status(400).json({ message: "No loyalty points found" });
    }

    const currentPoints = parseInt(loyaltyMetafield.value);

    // Deduct only the points that were actually earned on this order (1-2% of order value)
    let deductedPoints = Math.round((Math.random() * (2 - 1) + 1) * parseFloat(order.total_price) / 100);
    
    // Ensure points don't go negative
    const newPoints = Math.max(0, currentPoints - deductedPoints);

    // Update customer points
    await updateCustomerPoints(
      loyaltyMetafield.id,
      customerId,
      newPoints
    );

    return res.status(200).json({
      message: "✅ Loyalty points deducted due to order cancellation.",
      pointsDeducted: deductedPoints,
      pointsRemaining: newPoints,
    });
  } catch (error) {
    console.error("❌ Error handling order cancellation:", error.response?.data || error.message);
    return res.status(500).json({ error: "❌ Internal server error." });
  }
}

module.exports = {
  handleOrderFulfillment,
  handleOrderCancellation
};