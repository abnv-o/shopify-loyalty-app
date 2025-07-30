// controllers/shopify/adminController.js
const { cleanupExpiredCodes: cleanupExpiredCodesMemory } = require('../../utils/supabaseClient');
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
    
    // Clean up expired codes from memory
    const cleanedCount = await cleanupExpiredCodesMemory();
    
    console.log('✅ Expired codes cleanup completed');
    return res.json({ 
      success: true, 
      processed: cleanedCount,
      message: `Cleaned up ${cleanedCount} expired codes from memory`
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
    
    // Since we're using in-memory storage, used codes are automatically
    // cleaned up when they're marked as used. No additional cleanup needed.
    
    console.log('✅ Used codes cleanup completed (in-memory storage)');
    return res.json({ 
      success: true, 
      message: 'In-memory storage automatically manages used codes',
      deleted: 0
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