const axios = require("axios");
const loyaltyUtils = require("../../utils/loyaltyUtils");
const { getCustomerMetafields, updateCustomerPoints, SHOPIFY_STORE_URL, SHOPIFY_ACCESS_TOKEN } = require('./metafields');
const { handleResponse } = require('./utils');
const { calculateMaxRedeemablePoints } = require('./pointsService');
const { storeDiscountCode } = require('../../utils/supabaseClient');

/**
 * Check if a customer has active discount codes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Express response
 */
async function checkActiveDiscounts(req, res) {
  try {
    const { customerId } = req.params;
    
    // First check our in-memory cache
    const cachedRedemption = loyaltyUtils.hasActiveRedemption(customerId);
    if (cachedRedemption) {
      return res.json({
        hasActiveDiscount: true,
        activeDiscountInfo: {
          code: cachedRedemption.discountCode,
          expiresAt: cachedRedemption.expiresAt
        }
      });
    }
    
    // If nothing in cache, check Shopify API
    const response = await axios.get(
      `https://${SHOPIFY_STORE_URL}/admin/api/2023-10/price_rules.json?limit=250`,
      { headers: { "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN } }
    );
    
    // Filter for active loyalty redemptions for this customer
    const now = new Date().toISOString();
    const activeRules = response.data.price_rules.filter(rule => 
      rule.title.includes(`Customer:${customerId}`) && 
      rule.starts_at <= now &&
      rule.ends_at > now
    );
    
    const hasActiveDiscount = activeRules.length > 0;
    
    return res.json({
      hasActiveDiscount,
      activeDiscountCount: activeRules.length
    });
  } catch (error) {
    console.error("Error checking active discounts:", error);
    return res.status(500).json({ error: "Failed to check active discounts" });
  }
}

/**
 * Create a Shopify price rule and discount code
 * @param {string} customerId - Shopify customer ID
 * @param {string} cartToken - Cart token
 * @param {number} pointsToRedeem - Number of points to redeem
 * @param {Date} expiresAt - Expiration date
 * @returns {Object} - Created discount info
 */
async function createShopifyDiscount(customerId, cartToken, pointsToRedeem, expiresAt) {
  // Generate a discount code
  const discountCode = loyaltyUtils.generateDiscountCode(customerId, cartToken);
  
  try {
    // Create the price rule in Shopify
    console.log("📝 Creating price rule in Shopify");
    const priceRuleResponse = await axios.post(
      `https://${SHOPIFY_STORE_URL}/admin/api/2023-10/price_rules.json`,
      {
        price_rule: {
          title: `Loyalty Redemption - Customer:${customerId} - Cart:${cartToken} - Points:${pointsToRedeem}`,
          target_type: "line_item",
          target_selection: "all",
          allocation_method: "across",
          value_type: "fixed_amount",
          value: `-${pointsToRedeem}`,
          customer_selection: "prerequisite",
          prerequisite_customer_ids: [customerId],
          prerequisite_subtotal_range: {
            greater_than_or_equal_to: 2000
          },
          starts_at: new Date().toISOString(),
          ends_at: expiresAt.toISOString(),
          usage_limit: 1,
          once_per_customer: true
        }
      },
      { headers: { "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN } }
    );
    
    const priceRuleId = priceRuleResponse.data.price_rule.id;
    
    // Create the discount code in Shopify
    await axios.post(
      `https://${SHOPIFY_STORE_URL}/admin/api/2023-10/price_rules/${priceRuleId}/discount_codes.json`,
      {
        discount_code: {
          code: discountCode
        }
      },
      { headers: { "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN } }
    );
    
    // Store the discount code in Supabase
    await storeDiscountCode(discountCode, customerId, priceRuleId, expiresAt);
    
    return {
      discountCode,
      priceRuleId
    };
  } catch (error) {
    console.error("Error creating discount:", error);
    throw error;
  }
}

/**
 * Redeem loyalty points for a discount
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Express response
 */
async function redeemLoyaltyPoints(req, res) {
  try {
    console.log("\n📢 Loyalty Points Redemption Requested");
    
    // Handle both GET and POST requests
    const params = req.method === 'GET' ? req.query : req.body;
    console.log("➡️ Request Params:", params);
    
    // Parse input values
    const customerId = params.customerId;
    const pointsToRedeem = parseInt(params.pointsToRedeem, 10);
    const orderValue = parseFloat(params.orderValue);
    const cartToken = params.cartToken || `fallback-${Date.now()}`;
    
    console.log("📊 Parsed Values:", { 
      customerId, 
      pointsToRedeem,
      orderValue,
      cartToken
    });
    
    // Validate input
    if (!customerId) {
      console.log("❌ Error: Missing customerId");
      return handleResponse(req, res, false, "Missing customer ID");
    }
    
    if (isNaN(pointsToRedeem) || pointsToRedeem <= 0) {
      console.log("❌ Error: Invalid pointsToRedeem:", pointsToRedeem);
      return handleResponse(req, res, false, "Please enter a valid number of points");
    }
    
    if (isNaN(orderValue) || orderValue < 0) {
      console.log("❌ Error: Invalid orderValue:", orderValue);
      return handleResponse(req, res, false, "Invalid order value");
    }

    // Check if customer already has an active discount
    const activeRedemption = loyaltyUtils.hasActiveRedemption(customerId);
    if (activeRedemption) {
      console.log("❌ Customer already has active redemption:", activeRedemption);
      return handleResponse(req, res, false, "You already have an active discount code", {
        existingCode: activeRedemption.discountCode,
        expiresAt: activeRedemption.expiresAt
      });
    }

    // Fetch customer metafield
    console.log("🔍 Fetching customer loyalty points for customer:", customerId);
    const loyaltyMetafield = await getCustomerMetafields(customerId);
    
    if (!loyaltyMetafield) {
      console.log("❌ Error: No loyalty points found for customer:", customerId);
      return handleResponse(req, res, false, "No loyalty points found for your account");
    }

    const currentPoints = parseInt(loyaltyMetafield.value);
    console.log(`🔹 Customer Points Balance: ${currentPoints}`);

    if (currentPoints < pointsToRedeem) {
      console.log(`❌ Error: Not enough points (requested: ${pointsToRedeem}, available: ${currentPoints})`);
      return handleResponse(req, res, false, `You only have ${currentPoints} points available`);
    }

    // Calculate max redeemable points
    const maxRedeemable = calculateMaxRedeemablePoints(orderValue, currentPoints);
    console.log(`✅ Max Redeemable Points: ${maxRedeemable} for order value ₹${orderValue}`);

    if (orderValue < 2000) {
      console.log("❌ Error: Minimum order value not met");
      return handleResponse(req, res, false, "Minimum order value to redeem points is ₹2000");
    }

    if (pointsToRedeem > maxRedeemable) {
      console.log(`❌ Error: Max redeemable exceeded (${pointsToRedeem} > ${maxRedeemable})`);
      return handleResponse(req, res, false, `Maximum points you can redeem is ${maxRedeemable}`);
    }

    // Set expiration (15 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);
    
    // Create the discount in Shopify
    try {
      const { discountCode } = await createShopifyDiscount(
        customerId,
        cartToken,
        pointsToRedeem,
        expiresAt
      );
      
      // Track this redemption
      loyaltyUtils.trackRedemption(customerId, {
        discountCode,
        cartToken,
        pointsRedeemed: pointsToRedeem,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString()
      });

      // Deduct points from customer's account
      console.log(`💰 Updating customer points from ${currentPoints} to ${currentPoints - pointsToRedeem}`);
      
      const newPoints = currentPoints - pointsToRedeem;
      await updateCustomerPoints(loyaltyMetafield.id, customerId, newPoints);

      console.log("✅ Points Successfully Redeemed!");
      console.log(`🔹 New Balance: ${newPoints}`);
      
      // Return success response with the discount code
      return handleResponse(req, res, true, "Points successfully redeemed!", {
        discountCode,
        pointsRedeemed: pointsToRedeem,
        newBalance: newPoints,
        expiresAt: expiresAt.toISOString()
      });
    } catch (error) {
      console.error("❌ Error creating discount:", error);
      return handleResponse(req, res, false, "Failed to create discount code. Please try again.");
    }
  } catch (error) {
    console.error("❌ Server Error:", error);
    console.error("Error Stack:", error.stack);
    return handleResponse(req, res, false, "Internal server error. Please try again.");
  }
}

/**
 * Delete a discount code from Shopify
 * @param {string} priceRuleId - Shopify price rule ID
 * @returns {Promise<boolean>} - Success status
 */
async function deleteShopifyDiscount(priceRuleId) {
  try {
    await axios.delete(
      `https://${SHOPIFY_STORE_URL}/admin/api/2023-10/price_rules/${priceRuleId}.json`,
      { headers: { "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN } }
    );
    
    console.log(`✅ Deleted price rule ${priceRuleId} from Shopify`);
    return true;
  } catch (error) {
    console.error(`❌ Error deleting price rule ${priceRuleId}:`, error.message);
    return false;
  }
}


/**
 * Handle discount code usage webhook from Shopify
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Express response
 */
async function handleDiscountCodeUsage(req, res) {
  try {
    const { discount_code, order } = req.body;
    
    if (!discount_code || !discount_code.code) {
      return res.status(400).json({ error: "Invalid webhook payload" });
    }
    
    // Mark the discount code as used in Supabase
    const { markDiscountCodeAsUsed } = require('../../utils/supabaseClient');
    await markDiscountCodeAsUsed(discount_code.code);
    
    console.log(`✅ Discount code ${discount_code.code} marked as used for order ${order?.id || 'unknown'}`);
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Error handling discount code usage:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  checkActiveDiscounts,
  redeemLoyaltyPoints,
  deleteShopifyDiscount,
  handleDiscountCodeUsage
};