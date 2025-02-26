require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { createRateLimiter } = require('./utils/rateLimiter');
const shopifyRoutes = require("./routes/shopifyRoutes");

const app = express();

// Explicitly disable proxy trust
app.set('trust proxy', false);

// Middleware to remove X-Forwarded headers if they exist
app.use((req, res, next) => {
  // Remove X-Forwarded headers
  delete req.headers['x-forwarded-for'];
  delete req.headers['x-forwarded-host'];
  delete req.headers['x-forwarded-proto'];
  next();
});

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Create a logs directory if it doesn't exist
const fs = require('fs');
const path = require('path');
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Create rate limiter
const redemptionLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // requests per hour
  message: "Too many redemption attempts. Please try again later."
});

// Apply rate limiter to redemption endpoint
app.use("/shopify/loyalty/redeem", redemptionLimiter);

// Basic logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  if (req.method === 'POST') {
    console.log('Request Body:', JSON.stringify(req.body));
  }
  next();
});

// Load Shopify Routes
app.use("/shopify", shopifyRoutes);

// Debug Environment Variables
console.log("🔹 SHOPIFY_STORE_URL:", process.env.SHOPIFY_STORE_URL || "❌ Not Loaded");
console.log("🔹 SHOPIFY_ACCESS_TOKEN:", process.env.SHOPIFY_ACCESS_TOKEN ? "Loaded ✅" : "❌ Not Loaded");

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Minimal error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  
  res.status(500).json({
    error: 'An unexpected error occurred',
    message: err.message
  });
});