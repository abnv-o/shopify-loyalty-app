const axios = require("axios");

// ✅ Check Environment Variables
const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

if (!SHOPIFY_STORE_URL || !SHOPIFY_ACCESS_TOKEN) {
  console.error("❌ Error: Shopify environment variables are missing.");
}

/**
 * Fetch customer metafields from Shopify
 * @param {string} customerId - The Shopify customer ID
 * @returns {Promise<Object|null>} - Loyalty points metafield or null if not found
 */
async function getCustomerMetafields(customerId) {
  try {
    const response = await axios.get(
      `https://${SHOPIFY_STORE_URL}/admin/api/2023-10/customers/${customerId}/metafields.json`,
      {
        headers: { "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN },
      }
    );

    return response.data.metafields.find(m => m.namespace === "loyalty" && m.key === "points");
  } catch (error) {
    console.error("❌ Error fetching customer metafields:", error.response?.data || error.message);
    return null;
  }
}

/**
 * Update customer loyalty points
 * @param {string} metafieldId - The metafield ID to update
 * @param {number} newPoints - The new points value
 * @returns {Promise<Object>} - Shopify API response
 */
async function updateCustomerPoints(metafieldId, customerId, newPoints) {
  try {
    const response = await axios.put(
      `https://${SHOPIFY_STORE_URL}/admin/api/2023-10/metafields/${metafieldId}.json`,
      {
        metafield: {
          id: metafieldId,
          namespace: "loyalty",
          key: "points",
          value: newPoints.toString(),
          type: "number_integer",
        },
      },
      { headers: { "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN } }
    );
    
    console.log(`✅ Points updated: ${newPoints} for customer: ${customerId}`);
    return response.data;
  } catch (error) {
    console.error("❌ Error updating customer points:", error.response?.data || error.message);
    throw error;
  }
}

/**
 * Create loyalty points metafield if it doesn't exist
 * @param {string} customerId - The Shopify customer ID
 * @param {number} initialPoints - Initial points value
 * @returns {Promise<Object>} - Shopify API response
 */
async function createLoyaltyMetafield(customerId, initialPoints = 0) {
  try {
    const response = await axios.post(
      `https://${SHOPIFY_STORE_URL}/admin/api/2023-10/metafields.json`,
      {
        metafield: {
          namespace: "loyalty",
          key: "points",
          value: initialPoints.toString(),
          type: "number_integer",
          owner_resource: "customer",
          owner_id: customerId,
        },
      },
      { headers: { "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN } }
    );
    
    console.log(`✅ Created loyalty metafield for customer: ${customerId}`);
    return response.data;
  } catch (error) {
    console.error("❌ Error creating loyalty metafield:", error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  getCustomerMetafields,
  updateCustomerPoints,
  createLoyaltyMetafield,
  SHOPIFY_STORE_URL,
  SHOPIFY_ACCESS_TOKEN
};