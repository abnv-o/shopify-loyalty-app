/**
 * Main controller that consolidates all modules
 */

const orderHandlers = require('./orderHandlers');
const pointsService = require('./pointsService');
const redemption = require('./redemption');
const debug = require('./debug');

module.exports = {
  // Order management
  handleOrderFulfillment: orderHandlers.handleOrderFulfillment,
  handleOrderCancellation: orderHandlers.handleOrderCancellation,
  
  // Points management
  getCustomerLoyaltyPoints: pointsService.getCustomerLoyaltyPoints,
  
  // Redemption and discounts
  redeemLoyaltyPoints: redemption.redeemLoyaltyPoints,
  checkActiveDiscounts: redemption.checkActiveDiscounts,
  
  // Debug and configuration
  debugShopifyAppConfig: debug.debugShopifyAppConfig
};