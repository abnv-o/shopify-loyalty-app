// controllers/shopify/adminController.js
const { supabase } = require('../../utils/supabaseClient');
const axios = require('axios');

// Environment variables
const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY;

// Verify admin secret key
function verifyAdminKey(req, res, next) {
  const providedKey = req.query.key || '';
  if (providedKey !== ADMIN_SECRET_KEY) {
    return res.status(403).json({ error: "Unauthorized access" });
  }
  next();
}

// Clean up expired discount codes
async function cleanupExpiredCodes(req, res) {
  try {
    console.log('🔍 Running cleanup for expired discount codes');
    
    // Get expired unused codes
    const { data: expiredCodes, error } = await supabase
      .from('discount_codes')
      .select('*')
      .eq('status', 'unused')
      .lt('expires_at', new Date().toISOString());
      
    if (error) throw error;
    
    console.log(`📊 Found ${expiredCodes.length} expired discount codes`);
    
    // Process each expired code
    const results = [];
    for (const code of expiredCodes) {
      try {
        // Delete from Shopify
        await axios.delete(
          `https://${SHOPIFY_STORE_URL}/admin/api/2023-10/price_rules/${code.price_rule_id}.json`,
          { headers: { "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN } }
        );
        
        // Delete from Supabase
        const { error: deleteError } = await supabase
          .from('discount_codes')
          .delete()
          .eq('id', code.id);
          
        if (deleteError) throw deleteError;
        
        console.log(`✅ Deleted expired code: ${code.code}`);
        results.push({ code: code.code, success: true });
      } catch (codeError) {
        console.error(`❌ Error processing expired code ${code.code}:`, codeError.message);
        results.push({ code: code.code, success: false, error: codeError.message });
      }
    }
    
    console.log('✅ Expired codes cleanup completed');
    return res.json({ 
      success: true, 
      processed: expiredCodes.length,
      results 
    });
  } catch (error) {
    console.error('❌ Error in expired codes cleanup:', error.message);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

// Clean up used discount codes older than 24 hours
async function cleanupUsedCodes(req, res) {
  try {
    console.log('🔍 Running cleanup for used discount codes');
    
    // Calculate date 24 hours ago
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);
    
    // Get used codes older than 24 hours
    const { data: oldUsedCodes, error } = await supabase
      .from('discount_codes')
      .select('*')
      .eq('status', 'used')
      .lt('used_at', yesterday.toISOString());
      
    if (error) throw error;
    
    console.log(`📊 Found ${oldUsedCodes.length} used discount codes older than 24 hours`);
    
    // Delete the old used codes
    if (oldUsedCodes.length > 0) {
      const { error: deleteError } = await supabase
        .from('discount_codes')
        .delete()
        .eq('status', 'used')
        .lt('used_at', yesterday.toISOString());
        
      if (deleteError) throw deleteError;
    }
    
    console.log('✅ Used codes cleanup completed');
    return res.json({ 
      success: true, 
      deleted: oldUsedCodes.length 
    });
  } catch (error) {
    console.error('❌ Error in used codes cleanup:', error.message);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

module.exports = {
  verifyAdminKey,
  cleanupExpiredCodes,
  cleanupUsedCodes
};