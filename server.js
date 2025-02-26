require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { createRateLimiter } = require('./utils/rateLimiter');
const shopifyRoutes = require("./routes/shopifyRoutes");

const app = express();

// ✅ Set proxy trust explicitly for Vercel (Important)
app.set('trust proxy', 1);

// ✅ CORS Middleware - Allow all origins but control headers properly
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ✅ Body Parsing Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ✅ Debug: Print Incoming Requests for Troubleshooting
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.method === 'POST') {
    console.log('🔹 Request Body:', JSON.stringify(req.body));
  }
  next();
});

// ✅ Create Rate Limiter for Redemption API
const redemptionLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // requests per hour
  message: "Too many redemption attempts. Please try again later."
});
app.use("/shopify/loyalty/redeem", redemptionLimiter);

// ✅ Load Shopify Routes
app.use("/shopify", shopifyRoutes);

// ✅ Test Route - Useful for Checking Deployment
app.get("/", (req, res) => {
  res.json({ message: "🎉 Shopify Loyalty API is Running!" });
});

// ✅ Debug: Check if Environment Variables Are Loaded
console.log("🔹 SHOPIFY_STORE_URL:", process.env.SHOPIFY_STORE_URL || "❌ Not Loaded");
console.log("🔹 SHOPIFY_ACCESS_TOKEN:", process.env.SHOPIFY_ACCESS_TOKEN ? "Loaded ✅" : "❌ Not Loaded");

// ✅ Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// ✅ Improved Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("❌ Unhandled Error:", err);
  res.status(500).json({
    error: "An unexpected error occurred",
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : "❌ Hidden in Production"
  });
});
app.get("/debug", (req, res) => {
  res.json({ status: "✅ API is working!" });
});