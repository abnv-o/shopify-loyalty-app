const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase environment variables missing');
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Store a discount code in Supabase
 * @param {string} code - Discount code
 * @param {string} customerId - Shopify customer ID
 * @param {string} priceRuleId - Shopify price rule ID
 * @param {Date} expiresAt - Expiration date
 * @returns {Promise<Object>} - Inserted record
 */
async function storeDiscountCode(code, customerId, priceRuleId, expiresAt) {
  try {
    const { data, error } = await supabase
      .from('discount_codes')
      .insert([
        {
          code,
          customer_id: customerId,
          price_rule_id: priceRuleId,
          created_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          status: 'unused'
        }
      ])
      .select();

    if (error) throw error;
    
    console.log(`✅ Discount code stored in Supabase: ${code}`);
    return data[0];
  } catch (error) {
    console.error('❌ Error storing discount code in Supabase:', error.message);
    // Continue execution even if Supabase storage fails
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
    const { data, error } = await supabase
      .from('discount_codes')
      .update({ status: 'used', used_at: new Date().toISOString() })
      .eq('code', code)
      .select();

    if (error) throw error;
    
    console.log(`✅ Discount code marked as used: ${code}`);
    return true;
  } catch (error) {
    console.error('❌ Error marking discount code as used:', error.message);
    return false;
  }
}

module.exports = {
  supabase,
  storeDiscountCode,
  markDiscountCodeAsUsed
};