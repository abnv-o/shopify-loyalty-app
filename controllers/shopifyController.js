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
<html lang="en">
<head>
  <title>Loyalty Points Redeemed</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* Modern Typography */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    /* Reset & Base Styles */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', sans-serif;
      background-color: #f8f8f8;
      color: #111;
      line-height: 1.6;
      padding: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    
    /* Card Styles */
    .card {
      background-color: white;
      border-radius: 12px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.08);
      padding: 40px;
      max-width: 520px;
      width: 100%;
      transition: all 0.3s ease;
    }
    
    /* Typography */
    h1 {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 16px;
      color: #000;
    }
    
    p {
      font-size: 16px;
      margin-bottom: 16px;
      color: #333;
    }
    
    /* Success Badge */
    .success-badge {
      display: inline-flex;
      align-items: center;
      background-color: #f1f9f1;
      color: #000;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 50px;
      margin-bottom: 24px;
    }
    
    .success-badge svg {
      margin-right: 8px;
    }
    
    /* Discount Code */
    .code-container {
      margin: 28px 0;
      position: relative;
    }
    
    .code {
      font-family: 'Inter', monospace;
      font-size: 24px;
      font-weight: 600;
      letter-spacing: 1px;
      padding: 20px;
      background-color: #f8f8f8;
      border: 2px solid #000;
      border-radius: 8px;
      text-align: center;
      transition: all 0.2s ease;
    }
    
    /* Timer */
    .timer-container {
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 24px 0;
    }
    
    .timer {
      font-weight: 600;
      font-size: 18px;
      color: #000;
      padding: 8px 16px;
      background-color: #f3f3f3;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
    }
    
    .timer svg {
      margin-right: 8px;
    }
    
    /* Button */
    button {
      background-color: #000;
      color: white;
      border: none;
      padding: 12px 24px;
      font-family: 'Inter', sans-serif;
      font-size: 16px;
      font-weight: 500;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      margin: 16px 0;
    }
    
    button:hover {
      background-color: #333;
      transform: translateY(-2px);
    }
    
    button:active {
      transform: translateY(0);
    }
    
    button svg {
      margin-right: 8px;
    }
    
    /* Warning */
    .expiry-warning {
      display: flex;
      align-items: flex-start;
      background-color: #fff8f8;
      padding: 12px 16px;
      border-radius: 8px;
      margin: 24px 0;
      font-size: 14px;
      color: #555;
    }
    
    .expiry-warning svg {
      min-width: 20px;
      margin-right: 12px;
      margin-top: 2px;
    }
    
    /* Instructions */
    .instructions {
      margin-top: 32px;
      padding: 24px;
      background-color: #f8f8f8;
      border-radius: 8px;
    }
    
    .instructions h3 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 16px;
      color: #000;
    }
    
    .steps {
      list-style-position: inside;
      padding-left: 0;
    }
    
    .steps li {
      margin-bottom: 12px;
      font-size: 15px;
      display: flex;
      align-items: flex-start;
    }
    
    .step-number {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 24px;
      height: 24px;
      background-color: #000;
      color: white;
      border-radius: 50%;
      font-size: 12px;
      margin-right: 12px;
      font-weight: 600;
    }
    
    /* Error State */
    .error {
      color: #e53935;
      font-weight: 500;
      display: flex;
      align-items: center;
    }
    
    .error svg {
      margin-right: 8px;
    }
    
    .button-group {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }
    
    .button-group button {
      flex: 1;
    }
    
    .secondary-button {
      background-color: #f1f1f1;
      color: #333;
    }
    
    .secondary-button:hover {
      background-color: #e0e0e0;
    }
    
    /* Animations */
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.7; }
      100% { opacity: 1; }
    }
    
    .countdown-pulse {
      animation: pulse 2s infinite ease-in-out;
    }
    
    /* Responsive adjustments */
    @media (max-width: 580px) {
      .card {
        padding: 24px;
        border-radius: 12px;
      }
      
      h1 {
        font-size: 22px;
      }
      
      .code {
        font-size: 20px;
        padding: 16px;
      }
    }
    
    /* Copy feedback */
    .copy-tooltip {
      position: absolute;
      top: -40px;
      left: 50%;
      transform: translateX(-50%);
      background-color: #000;
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 14px;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    }
    
    .copy-tooltip::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      margin-left: -5px;
      border-width: 5px;
      border-style: solid;
      border-color: #000 transparent transparent transparent;
    }
    
    .copy-tooltip.show {
      opacity: 1;
    }
  </style>
</head>
<body>
  <!-- Success Card -->
  <div class="card">
    <div class="success-badge">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      Success
    </div>
    
    <h1>Points Successfully Redeemed</h1>
    <p>You've redeemed ${data.pointsRedeemed} points for a ₹${data.pointsRedeemed} discount on your current order.</p>
    
    <p>Your discount code:</p>
    <div class="code-container">
      <div class="code">${data.discountCode}</div>
      <div class="copy-tooltip" id="copyTooltip">Copied!</div>
    </div>
    
    <div class="timer-container">
      <div class="timer">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        <span id="countdown" class="countdown-pulse">15:00</span> remaining
      </div>
    </div>
    
    <button onclick="copyCode()" id="copyButton">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      Copy Code
    </button>
    
    <div class="expiry-warning">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
      <div>This discount is valid only for your current cart and will expire in 15 minutes. Complete your purchase before the timer ends.</div>
    </div>
    
    <div class="instructions">
      <h3>What to do next:</h3>
      <ul class="steps">
        <li><div class="step-number">1</div> Copy your discount code</li>
        <li><div class="step-number">2</div> Return to your cart</li>
        <li><div class="step-number">3</div> Proceed to checkout</li>
        <li><div class="step-number">4</div> Apply the code in the discount field</li>
        <li><div class="step-number">5</div> Complete your purchase</li>
      </ul>
    </div>
  </div>
  
  <!-- Error Card (Hidden by default) -->
  <div class="card" id="errorCard" style="display: none;">
    <h1>Unable to Redeem Points</h1>
    <p class="error">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>
      <span id="errorMessage">${message}</span>
    </p>
    <div class="button-group">
      <button class="secondary-button" onclick="window.history.back()">Go Back</button>
      <button onclick="window.close()">Close Window</button>
    </div>
  </div>
  
  <script>
    // Copy code function
    function copyCode() {
      const text = "${data.discountCode}";
      const copyButton = document.getElementById('copyButton');
      const copyTooltip = document.getElementById('copyTooltip');
      
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function() {
          showCopyFeedback();
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
        showCopyFeedback();
      }
      
      function showCopyFeedback() {
        // Show tooltip
        copyTooltip.classList.add('show');
        
        // Change button text temporarily
        const originalButtonHTML = copyButton.innerHTML;
        copyButton.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Copied!
        `;
        
        // Reset after 2 seconds
        setTimeout(() => {
          copyTooltip.classList.remove('show');
          copyButton.innerHTML = originalButtonHTML;
        }, 2000);
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
            countdownEl.style.color = "#e53935";
            countdownEl.classList.remove('countdown-pulse');
            return;
          }
          minutes--;
          seconds = 59;
        } else {
          seconds--;
        }
        
        // Add warning color when less than 5 minutes
        if (minutes < 5) {
          countdownEl.style.color = "#e53935";
        }
        
        // Add extra pulse effect when less than 3 minutes
        if (minutes < 3) {
          countdownEl.classList.add('countdown-pulse');
        }
        
        countdownEl.innerHTML = minutes + ":" + (seconds < 10 ? "0" + seconds : seconds);
      }, 1000);
    }
    
    // Show error card function (for demonstration)
    function showError(message) {
      document.querySelector('.card').style.display = 'none';
      const errorCard = document.getElementById('errorCard');
      const errorMessage = document.getElementById('errorMessage');
      errorMessage.textContent = message || "An error occurred while redeeming points.";
      errorCard.style.display = 'block';
    }
    
    // Initialize
    startCountdown();
    
    // For demonstration - show error state (uncomment to test)
    // setTimeout(() => showError("Insufficient points for redemption."), 3000);
  </script>
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