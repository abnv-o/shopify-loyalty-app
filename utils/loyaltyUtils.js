// utils/loyaltyUtils.js
const crypto = require('crypto');

/**
 * Generate a secure discount code
 * @param {string} customerId - Customer ID
 * @param {string} cartToken - Cart token
 * @returns {string} - Generated discount code
 */
function generateDiscountCode(customerId, cartToken) {
  const timestamp = Date.now().toString().slice(-11);
  const hash = crypto.createHash('md5')
    .update(`${customerId}-${cartToken}-${timestamp}`)
    .digest('hex')
    .slice(0, 10);
  
  return `PSK${timestamp}${hash}`.toUpperCase();
}

module.exports = {
  generateDiscountCode
};