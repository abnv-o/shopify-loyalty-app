const NodeCache = require('node-cache');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// In-memory cache for tracking active redemptions
const redemptionCache = new NodeCache({ stdTTL: 900 }); // 15 minutes TTL

// Generate secure discount code
function generateDiscountCode(customerId, cartToken) {
  // Create random bytes for entropy
  const randomBytes = crypto.randomBytes(4).toString('hex');
  
  // Use parts of customer ID and cart token
  const customerPart = customerId.slice(-3);
  const cartPart = cartToken ? cartToken.slice(-8) : crypto.randomBytes(4).toString('hex').slice(0, 8);
  
  // Combine into final code
  return `LTY${customerPart}${cartPart}${randomBytes}`.toUpperCase();
}

// Track a new redemption in memory
function trackRedemption(customerId, data) {
  redemptionCache.set(`customer:${customerId}`, data);
  logRedemption(data);
}

// Check if customer has active redemption
function hasActiveRedemption(customerId) {
  return redemptionCache.get(`customer:${customerId}`);
}

// Log redemption to file
function logRedemption(data) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    ...data
  };
  
  const logDir = path.join(__dirname, '..', 'logs');
  const logPath = path.join(logDir, 'redemptions.log');
  
  // Ensure log directory exists
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  fs.appendFileSync(
    logPath,
    JSON.stringify(logEntry) + '\n',
    { encoding: 'utf8' }
  );
}

module.exports = {
  generateDiscountCode,
  trackRedemption,
  hasActiveRedemption,
  logRedemption
};