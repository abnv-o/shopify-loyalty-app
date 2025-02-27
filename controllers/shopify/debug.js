const axios = require("axios");
const { SHOPIFY_STORE_URL, SHOPIFY_ACCESS_TOKEN } = require('./metafields');

/**
 * Debug endpoint to test Shopify API configuration and permissions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - Express response with debug information
 */
async function debugShopifyAppConfig(req, res) {
  try {
    // Test Price Rule Creation
    try {
      const testPriceRulePayload = {
        price_rule: {
          title: `Debug Price Rule - ${new Date().toISOString()}`,
          target_type: "line_item",
          target_selection: "all",
          allocation_method: "across",
          value_type: "fixed_amount",
          value: "-10",
          starts_at: new Date().toISOString(),
          ends_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
          customer_selection: "all",
          usage_limit: 1
        }
      };

      const priceRuleResponse = await axios.post(
        `https://${SHOPIFY_STORE_URL}/admin/api/2023-10/price_rules.json`,
        testPriceRulePayload,
        {
          headers: { 
            'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log("Price Rule Creation Test:", {
        status: 'Success',
        priceRuleId: priceRuleResponse.data.price_rule.id
      });

      // Create a discount code for the test price rule
      const discountCodeResponse = await axios.post(
        `https://${SHOPIFY_STORE_URL}/admin/api/2023-10/price_rules/${priceRuleResponse.data.price_rule.id}/discount_codes.json`,
        {
          discount_code: {
            code: `DEBUG-${Date.now()}`
          }
        },
        {
          headers: { 
            'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
            'Content-Type': 'application/json'
          }
        }
      );

      return res.json({
        status: 'success',
        shopDetails: {
          name: 'kuttimalu',
          myshopifyDomain: 'kuttimalu.myshopify.com'
        },
        scopeTest: {
          priceRuleCreation: 'Successful ✅',
          discountCodeCreation: 'Successful ✅'
        },
        recommendedScopes: [
          'read_price_rules',
          'write_price_rules',
          'read_discounts',
          'write_discounts'
        ]
      });

    } catch (apiError) {
      console.error("Price Rule Creation Error:", {
        message: apiError.message,
        response: apiError.response?.data,
        status: apiError.response?.status
      });

      return res.status(500).json({
        error: 'Price Rule Creation Failed',
        details: {
          message: apiError.message,
          responseData: apiError.response?.data,
          status: apiError.response?.status
        }
      });
    }
  } catch (error) {
    console.error("Unexpected Error:", error);
    return res.status(500).json({
      error: 'Unexpected error',
      details: error.message
    });
  }
}

module.exports = {
  debugShopifyAppConfig
};