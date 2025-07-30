const express = require("express");
const shopifyController = require("../controllers/shopify");
const adminController = require('../controllers/shopify/adminController');

const router = express.Router();

// Middleware to parse various request bodies
router.use(express.urlencoded({ extended: true }));
router.use(express.json());

// Webhook Routes
router.post("/webhook/order-fulfilled", shopifyController.handleOrderFulfillment);
router.post("/webhook/order-canceled", shopifyController.handleOrderCancellation);
// Webhook for discount code usage
router.post("/webhook/discount-code-used", shopifyController.handleDiscountCodeUsage);

// Customer Loyalty Points Routes
router.get("/customer/:customerId/points", shopifyController.getCustomerLoyaltyPoints);

// Loyalty Points Redemption Routes
router.get("/loyalty/redeem", shopifyController.redeemLoyaltyPoints);
router.post("/loyalty/redeem", shopifyController.redeemLoyaltyPoints);

// Check active discounts
router.get("/customer/:customerId/active-discounts", shopifyController.checkActiveDiscounts);

// Admin routes - protected by secret key
router.get("/admin/cleanup-expired", 
  adminController.verifyAdminKey, 
  adminController.cleanupExpiredCodes
);

router.get("/admin/cleanup-used", 
  adminController.verifyAdminKey, 
  adminController.cleanupUsedCodes
);



// Shopify App Configuration Debug Endpoint
router.get("/debug/app-config", shopifyController.debugShopifyAppConfig);

// Test endpoint
router.get("/test", (req, res) => {
  console.log("✅ Test endpoint hit!");
  res.header("Access-Control-Allow-Origin", "*");
  res.status(200).send("Connection successful!");
});

// Debug info page
router.get("/loyalty-info", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Loyalty System Status</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .card { border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 4px; }
        .success { color: green; }
        .error { color: red; }
      </style>
    </head>
    <body>
      <h1>Loyalty System Status</h1>
      <div class="card">
        <h2>Server Time</h2>
        <p>Current server time: ${new Date().toISOString()}</p>
      </div>
      <div class="card">
        <h2>Environment</h2>
        <p>SHOPIFY_STORE_URL: ${process.env.SHOPIFY_STORE_URL ? "Configured ✅" : "Not Configured ❌"}</p>
        <p>SHOPIFY_ACCESS_TOKEN: ${process.env.SHOPIFY_ACCESS_TOKEN ? "Configured ✅" : "Not Configured ❌"}</p>
      </div>
      <div class="card">
        <h2>System Status</h2>
        <p class="success">System is operational ✅</p>
        <p><strong>Storage:</strong> In-memory (no database required)</p>
      </div>
    </body>
    </html>
  `);
});

module.exports = router;