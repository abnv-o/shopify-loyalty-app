// utils/supabaseClient.js
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client - ONLY ONCE
console.log('Initializing Supabase client');
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
    console.log(`📝 Attempting to mark code as used: ${code}`);
    
    // First check if the code exists and is unused
    const { data: existing, error: queryError } = await supabase
      .from('discount_codes')
      .select('id, code, status')
      .eq('code', code)
      .limit(1);
      
    if (queryError) {
      console.error(`❌ Error querying discount code: ${queryError.message}`);
      return false;
    }
    
    if (!existing || existing.length === 0) {
      console.log(`⚠️ Discount code not found in database: ${code}`);
      return false;
    }
    
    if (existing[0].status === 'used') {
      console.log(`ℹ️ Discount code already marked as used: ${code}`);
      return true; // Already in the desired state
    }
    
    console.log(`🔄 Updating discount code ${code} status to 'used'`);
    
    // Update the discount code status
    const { data, error } = await supabase
      .from('discount_codes')
      .update({ 
        status: 'used', 
        used_at: new Date().toISOString() 
      })
      .eq('code', code)
      .select();

    if (error) {
      console.error(`❌ Error updating discount code status: ${error.message}`);
      return false;
    }
    
    console.log(`✅ Discount code marked as used: ${code}`);
    return true;
  } catch (error) {
    console.error(`❌ Unexpected error marking discount code as used: ${error.message}`);
    return false;
  }
}

module.exports = {
  supabase,
  storeDiscountCode,
  markDiscountCodeAsUsed
};