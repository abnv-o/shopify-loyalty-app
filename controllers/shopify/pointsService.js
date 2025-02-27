const { getCustomerMetafields } = require('./metafields');

/**
 * Get customer loyalty points
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Express response
 */
async function getCustomerLoyaltyPoints(req, res) {
  try {
    const customerId = req.params.customerId;
    if (!customerId) {
      return res.status(400).json({ message: "Customer ID is required" });
    }

    const loyaltyMetafield = await getCustomerMetafields(customerId);
    if (!loyaltyMetafield) {
      return res.status(404).json({ message: "No loyalty points found" });
    }

    return res.status(200).json({ 
      loyaltyPoints: parseInt(loyaltyMetafield.value) 
    });
  } catch (error) {
    console.error("❌ Error fetching loyalty points:", error.response?.data || error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Calculate maximum redeemable points based on order value
 * @param {number} orderValue - Order total value
 * @param {number} currentPoints - Customer's current points
 * @returns {number} - Maximum redeemable points
 */
function calculateMaxRedeemablePoints(orderValue, currentPoints) {
  let maxRedeemable = 0;
  
  if (orderValue >= 2000 && orderValue < 10000) {
    maxRedeemable = Math.floor(currentPoints * 0.15);
  } else if (orderValue >= 10000) {
    maxRedeemable = Math.floor(currentPoints * 0.25);
  }
  
  return maxRedeemable;
}

module.exports = {
  getCustomerLoyaltyPoints,
  calculateMaxRedeemablePoints
};