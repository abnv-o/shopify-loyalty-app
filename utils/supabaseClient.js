// utils/supabaseClient.js - Database-free version
// In-memory storage for discount codes (resets on server restart)

// In-memory storage
const discountCodes = new Map();

/**
 * Store a discount code in memory
 * @param {string} code - Discount code
 * @param {string} customerId - Shopify customer ID
 * @param {string} priceRuleId - Shopify price rule ID
 * @param {Date} expiresAt - Expiration date
 * @returns {Promise<Object>} - Inserted record
 */
async function storeDiscountCode(code, customerId, priceRuleId, expiresAt) {
  try {
    const record = {
      id: Date.now().toString(),
      code,
      customer_id: customerId,
      price_rule_id: priceRuleId,
      expires_at: expiresAt.toISOString(),
      status: 'unused',
      created_at: new Date().toISOString()
    };
    
    discountCodes.set(code, record);
    
    console.log(`✅ Discount code stored in memory: ${code}`);
    return record;
  } catch (error) {
    console.error('❌ Error storing discount code in memory:', error.message);
    return null;
  }
}

/**
 * Mark a discount code as used
 * @param {string} code - Discount code
 * @returns {Promise<boolean>} - Success status
 */
async function markDiscountCodeAsUsed(code) {
  try {
    console.log(`📝 Attempting to mark code as used: ${code}`);
    
    const record = discountCodes.get(code);
    
    if (!record) {
      console.log(`⚠️ Discount code not found in memory: ${code}`);
      return false;
    }
    
    if (record.status === 'used') {
      console.log(`ℹ️ Discount code already marked as used: ${code}`);
      return true; // Already in the desired state
    }
    
    console.log(`🔄 Updating discount code ${code} status to 'used'`);
    
    // Update the discount code status
    record.status = 'used';
    record.used_at = new Date().toISOString();
    discountCodes.set(code, record);
    
    console.log(`✅ Discount code marked as used: ${code}`);
    return true;
  } catch (error) {
    console.error(`❌ Unexpected error marking discount code as used: ${error.message}`);
    return false;
  }
}

/**
 * Check if customer has active discount codes
 * @param {string} customerId - Customer ID
 * @returns {Promise<Array>} - Active discount codes
 */
async function getActiveDiscounts(customerId) {
  try {
    const now = new Date().toISOString();
    const activeCodes = [];
    
    for (const [code, record] of discountCodes.entries()) {
      if (record.customer_id === customerId && 
          record.status === 'unused' && 
          record.expires_at > now) {
        activeCodes.push(record);
      }
    }
    
    return activeCodes;
  } catch (error) {
    console.error('❌ Error checking active discounts:', error.message);
    return [];
  }
}

/**
 * Clean up expired codes
 * @returns {Promise<number>} - Number of codes cleaned up
 */
async function cleanupExpiredCodes() {
  try {
    const now = new Date().toISOString();
    let cleanedCount = 0;
    
    for (const [code, record] of discountCodes.entries()) {
      if (record.status === 'unused' && record.expires_at < now) {
        discountCodes.delete(code);
        cleanedCount++;
      }
    }
    
    console.log(`✅ Cleaned up ${cleanedCount} expired codes`);
    return cleanedCount;
  } catch (error) {
    console.error('❌ Error cleaning up expired codes:', error.message);
    return 0;
  }
}

// Mock supabase object for compatibility
const supabase = {
  from: (table) => ({
    select: () => ({
      eq: (field, value) => ({
        eq: (field2, value2) => ({
          gt: (field3, value3) => ({
            limit: (limit) => {
              if (table === 'discount_codes' && field === 'customer_id') {
                return getActiveDiscounts(value).then(codes => ({
                  data: codes.slice(0, limit),
                  error: null
                }));
              }
              return Promise.resolve({ data: [], error: null });
            }
          })
        })
      })
    }),
    insert: () => ({
      select: () => Promise.resolve({ data: [], error: null })
    }),
    update: () => ({
      eq: () => ({
        select: () => Promise.resolve({ data: [], error: null })
      })
    }),
    delete: () => ({
      eq: () => Promise.resolve({ error: null })
    })
  })
};

module.exports = {
  supabase,
  storeDiscountCode,
  markDiscountCodeAsUsed,
  getActiveDiscounts,
  cleanupExpiredCodes
};