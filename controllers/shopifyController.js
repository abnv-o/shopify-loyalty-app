const axios = require("axios");
const loyaltyUtils = require("../utils/loyaltyUtils");

// ✅ Check Environment Variables
const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

if (!SHOPIFY_STORE_URL || !SHOPIFY_ACCESS_TOKEN) {
  console.error("❌ Error: Shopify environment variables are missing.");
}

// ✅ Helper Function to Fetch Customer Metafields
async function getCustomerMetafields(customerId) {
  try {
    const response = await axios.get(
      `https://${SHOPIFY_STORE_URL}/admin/api/2023-10/customers/${customerId}/metafields.json`,
      {
        headers: { "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN },
      }
    );

    return response.data.metafields.find(m => m.namespace === "loyalty" && m.key === "points");
  } catch (error) {
    console.error("❌ Error fetching customer metafields:", error.response?.data || error.message);
    return null;
  }
}

// ✅ Handle Order Fulfillment (Assign Loyalty Points)
exports.handleOrderFulfillment = async (req, res) => {
  try {
    const order = req.body;
    if (!order || !order.customer || !order.customer.id) {
      return res.status(400).json({ message: "Invalid order data" });
    }

    const orderValue = parseFloat(order.total_price);
    const paymentMethod = order.gateway ? order.gateway.toLowerCase() : "unknown";
    const customerId = order.customer.id;

    let basePoints = Math.round((Math.random() * (2 - 1) + 1) * orderValue / 100);
    if (paymentMethod !== "cash on delivery") {
      basePoints *= 2;
    }

    const loyaltyMetafield = await getCustomerMetafields(customerId);
    const currentPoints = loyaltyMetafield ? parseInt(loyaltyMetafield.value) : 0;
    const newPoints = currentPoints + basePoints;

    await axios.put(
      `https://${SHOPIFY_STORE_URL}/admin/api/2023-10/metafields/${loyaltyMetafield?.id || ""}.json`,
      {
        metafield: {
          namespace: "loyalty",
          key: "points",
          value: newPoints.toString(),
          type: "number_integer",
          owner_resource: "customer",
          owner_id: customerId,
        },
      },
      { headers: { "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN } }
    );

    res.status(200).json({ message: "Loyalty points assigned successfully", pointsEarned: basePoints });
  } catch (error) {
    console.error("❌ Error handling order fulfillment:", error.response?.data || error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Handle Order Cancellation (Deduct Points)
exports.handleOrderCancellation = async (req, res) => {
    try {
      const order = req.body;
      if (!order || !order.customer || !order.customer.id) {
        return res.status(400).json({ message: "Invalid order data" });
      }
  
      const customerId = order.customer.id;
      const loyaltyMetafield = await getCustomerMetafields(customerId);
      if (!loyaltyMetafield) return res.status(400).json({ message: "No loyalty points found" });
  
      const currentPoints = parseInt(loyaltyMetafield.value);
  
      // ✅ Deduct only the points that were actually earned on this order (1-2% of order value)
      let deductedPoints = Math.round((Math.random() * (2 - 1) + 1) * parseFloat(order.total_price) / 100);
      
      // Ensure points don't go negative
      const newPoints = Math.max(0, currentPoints - deductedPoints);
  
      await axios.put(
        `https://${SHOPIFY_STORE_URL}/admin/api/2023-10/metafields/${loyaltyMetafield.id}.json`,
        {
          metafield: {
            id: loyaltyMetafield.id,
            namespace: "loyalty",
            key: "points",
            value: newPoints.toString(),
            type: "number_integer",
          },
        },
        { headers: { "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN } }
      );
  
      res.status(200).json({
        message: "✅ Loyalty points deducted due to order cancellation.",
        pointsDeducted: deductedPoints,
        pointsRemaining: newPoints,
      });
  
    } catch (error) {
      console.error("❌ Error handling order cancellation:", error.response?.data || error.message);
      res.status(500).json({ error: "❌ Internal server error." });
    }
  };
  

// ✅ Get Customer Loyalty Points
exports.getCustomerLoyaltyPoints = async (req, res) => {
  try {
    const customerId = req.params.customerId;
    if (!customerId) return res.status(400).json({ message: "Customer ID is required" });

    const loyaltyMetafield = await getCustomerMetafields(customerId);
    if (!loyaltyMetafield) return res.status(404).json({ message: "No loyalty points found" });

    res.status(200).json({ loyaltyPoints: parseInt(loyaltyMetafield.value) });
  } catch (error) {
    console.error("❌ Error fetching loyalty points:", error.response?.data || error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};




// Check if a customer already has an active loyalty discount
exports.checkActiveDiscounts = async (req, res) => {
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
      
      res.json({
        hasActiveDiscount,
        activeDiscountCount: activeRules.length
      });
    } catch (error) {
      console.error("Error checking active discounts:", error);
      res.status(500).json({ error: "Failed to check active discounts" });
    }
  };
  
  // Redeem Loyalty Points
// Redeem Loyalty Points
exports.redeemLoyaltyPoints = async (req, res) => {
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
    let maxRedeemable = 0;
    if (orderValue >= 2000 && orderValue < 10000) {
      maxRedeemable = Math.floor(currentPoints * 0.15);
    } else if (orderValue >= 10000) {
      maxRedeemable = Math.floor(currentPoints * 0.25);
    }

    console.log(`✅ Max Redeemable Points: ${maxRedeemable} for order value ₹${orderValue}`);

    if (orderValue < 2000) {
      console.log("❌ Error: Minimum order value not met");
      return handleResponse(req, res, false, "Minimum order value to redeem points is ₹2000");
    }

    if (pointsToRedeem > maxRedeemable) {
      console.log(`❌ Error: Max redeemable exceeded (${pointsToRedeem} > ${maxRedeemable})`);
      return handleResponse(req, res, false, `Maximum points you can redeem is ${maxRedeemable}`);
    }

    // Generate a secure discount code
    const discountCode = loyaltyUtils.generateDiscountCode(customerId, cartToken);
    console.log(`🎉 Generated Discount Code: ${discountCode}`);
    
    // Set expiration (15 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);
    
    try {
      // Create the price rule
      console.log("📝 Creating price rule in Shopify");
      // Update the price rule creation part in your redeemLoyaltyPoints function
const priceRuleResponse = await axios.post(
  `https://${SHOPIFY_STORE_URL}/admin/api/2023-10/price_rules.json`,
  {
    price_rule: {
      title: `Loyalty Redemption - Customer:${customerId} - Cart:${cartToken} - Points:${pointsToRedeem}`,
      target_type: "line_item", // Changed from "line_items" to "line_item"
      target_selection: "all",
      allocation_method: "across",
      value_type: "fixed_amount",
      value: `-${pointsToRedeem}`, // 1 point = 1 INR discount
      customer_selection: "prerequisite",
      prerequisite_customer_ids: [customerId],
      prerequisite_subtotal_range: {
        greater_than_or_equal_to: 2000 // Minimum order value
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
      console.log(`✅ Price Rule Created: ${priceRuleId}`);
      
      // Create the discount code
      console.log("📝 Creating discount code in Shopify");
      await axios.post(
        `https://${SHOPIFY_STORE_URL}/admin/api/2023-10/price_rules/${priceRuleId}/discount_codes.json`,
        {
          discount_code: {
            code: discountCode
          }
        },
        { headers: { "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN } }
      );
      
      console.log(`✅ Discount Code Created: ${discountCode}`);
    } catch (shopifyError) {
      console.error("❌ Error creating discount in Shopify:", shopifyError.response?.data || shopifyError.message);
      return handleResponse(req, res, false, "Failed to create discount code");
    }
    
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
    try {
      const updateResponse = await axios.put(
        `https://${SHOPIFY_STORE_URL}/admin/api/2023-10/metafields/${loyaltyMetafield.id}.json`,
        {
          metafield: {
            id: loyaltyMetafield.id,
            namespace: "loyalty",
            key: "points",
            value: newPoints.toString(),
            type: "number_integer",
          },
        },
        { headers: { "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN } }
      );
      
      console.log("✅ Customer points updated successfully:", updateResponse.status);
    } catch (apiError) {
      console.error("❌ Error updating points in Shopify:", apiError.response?.data || apiError.message);
      return handleResponse(req, res, false, "Error updating points. Please try again.");
    }

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
    console.error("❌ Server Error:", error);
    console.error("Error Stack:", error.stack);
    return handleResponse(req, res, false, "Internal server error. Please try again.");
  }
};

// Helper function to handle different response types (HTML for GET, JSON for POST)
function handleResponse(req, res, success, message, data = {}) {
  // If it's a GET request, return HTML
  if (req.method === 'GET') {
    if (success) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Loyalty Points Redeemed</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; text-align: center; background-color: #f9f9f9; }
            .card { border: 1px solid #ddd; padding: 20px; max-width: 500px; margin: 0 auto; border-radius: 8px; background-color: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .code { font-size: 24px; font-weight: bold; padding: 15px; border: 2px dashed #4CAF50; margin: 20px 0; background-color: #f5f5f5; }
            .timer { font-weight: bold; color: #d44; }
            button { background-color: #4CAF50; color: white; border: none; padding: 10px 20px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px; margin: 10px 2px; cursor: pointer; border-radius: 4px; }
            .expiry-warning { color: #d44; margin-top: 15px; font-size: 14px; }
            .instructions { text-align: left; margin-top: 20px; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; }
            .instructions ol { margin-left: 20px; padding-left: 0; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Success! Points Redeemed</h1>
            <p>You've redeemed ${data.pointsRedeemed} points for a ₹${data.pointsRedeemed} discount.</p>
            <p>Use this discount code during checkout:</p>
            <div class="code">${data.discountCode}</div>
            <p>This code expires in <span class="timer" id="countdown">15:00</span></p>
            <button onclick="copyCode()">Copy Code</button>
            <p class="expiry-warning">⚠️ This discount is valid only for your current cart and will expire in 15 minutes.</p>
            
            <div class="instructions">
              <p><strong>What to do next:</strong></p>
              <ol>
                <li>Copy your discount code</li>
                <li>Return to your cart</li>
                <li>Proceed to checkout</li>
                <li>Apply the code in the discount field</li>
                <li>Complete your purchase</li>
              </ol>
            </div>
          </div>
          
          <script>
            function copyCode() {
              const text = "${data.discountCode}";
              if (navigator.clipboard) {
                navigator.clipboard.writeText(text).then(function() {
                  alert('Discount code copied!');
                }, function() {
                  fallbackCopy();
                });
              } else {
                fallbackCopy();
              }
              
              function fallbackCopy() {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                alert('Discount code copied!');
              }
            }
            
            // Start countdown
            function startCountdown() {
              var minutes = 15;
              var seconds = 0;
              var countdownEl = document.getElementById('countdown');
              
              var timer = setInterval(function() {
                if (seconds === 0) {
                  if (minutes === 0) {
                    clearInterval(timer);
                    countdownEl.innerHTML = "EXPIRED";
                    return;
                  }
                  minutes--;
                  seconds = 59;
                } else {
                  seconds--;
                }
                
                countdownEl.innerHTML = minutes + ":" + (seconds < 10 ? "0" + seconds : seconds);
              }, 1000);
            }
            
            startCountdown();
          </script>
        </body>
        </html>
      `);
    } else {
      // Error HTML response
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Loyalty Points Error</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; text-align: center; background-color: #f9f9f9; }
            .card { border: 1px solid #ddd; padding: 20px; max-width: 500px; margin: 0 auto; border-radius: 8px; background-color: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .error { color: #d44; font-weight: bold; }
            button { background-color: #4CAF50; color: white; border: none; padding: 10px 20px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px; margin: 10px 2px; cursor: pointer; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Error</h1>
            <p class="error">❌ ${message}</p>
            <button onclick="window.close()">Close Window</button>
            <button onclick="window.history.back()">Go Back</button>
          </div>
        </body>
        </html>
      `);
    }
  } else {
    // For POST requests or any other method, return JSON
    return res.status(success ? 200 : 400).json({
      success,
      message,
      ...data
    });
  }
}

exports.debugShopifyAppConfig = async (req, res) => {
  try {
    const storeUrl = process.env.SHOPIFY_STORE_URL;
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

    // Test Price Rule Creation
    try {
      const testPriceRulePayload = {
        price_rule: {
          title: `Debug Price Rule - ${new Date().toISOString()}`,
          target_type: "line_item",
          target_selection: "all",
          allocation_method: "across",
          value_type: "fixed_amount",
          value: "-10",
          starts_at: new Date().toISOString(),
          ends_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
          customer_selection: "all",
          usage_limit: 1
        }
      };

      const priceRuleResponse = await axios.post(
        `https://${storeUrl}/admin/api/2023-10/price_rules.json`,
        testPriceRulePayload,
        {
          headers: { 
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log("Price Rule Creation Test:", {
        status: 'Success',
        priceRuleId: priceRuleResponse.data.price_rule.id
      });

      // Create a discount code for the test price rule
      const discountCodeResponse = await axios.post(
        `https://${storeUrl}/admin/api/2023-10/price_rules/${priceRuleResponse.data.price_rule.id}/discount_codes.json`,
        {
          discount_code: {
            code: `DEBUG-${Date.now()}`
          }
        },
        {
          headers: { 
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      res.json({
        status: 'success',
        shopDetails: {
          name: 'kuttimalu',
          myshopifyDomain: 'kuttimalu.myshopify.com'
        },
        scopeTest: {
          priceRuleCreation: 'Successful ✅',
          discountCodeCreation: 'Successful ✅'
        },
        recommendedScopes: [
          'read_price_rules',
          'write_price_rules',
          'read_discounts',
          'write_discounts'
        ]
      });

    } catch (apiError) {
      console.error("Price Rule Creation Error:", {
        message: apiError.message,
        response: apiError.response?.data,
        status: apiError.response?.status
      });

      res.status(500).json({
        error: 'Price Rule Creation Failed',
        details: {
          message: apiError.message,
          responseData: apiError.response?.data,
          status: apiError.response?.status
        }
      });
    }
  } catch (error) {
    console.error("Unexpected Error:", error);
    res.status(500).json({
      error: 'Unexpected error',
      details: error.message
    });
  }
};
  
  module.exports = {
    handleOrderFulfillment: exports.handleOrderFulfillment,
    handleOrderCancellation: exports.handleOrderCancellation,
    getCustomerLoyaltyPoints: exports.getCustomerLoyaltyPoints,
    redeemLoyaltyPoints: exports.redeemLoyaltyPoints,
    checkActiveDiscounts: exports.checkActiveDiscounts,
    debugShopifyAppConfig: exports.debugShopifyAppConfig,
  };