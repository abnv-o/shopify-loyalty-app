import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const SHOPIFY_STORE_URL = Deno.env.get("SHOPIFY_STORE_URL");
const SHOPIFY_ACCESS_TOKEN = Deno.env.get("SHOPIFY_ACCESS_TOKEN");

serve(async (req) => {
  try {
    // Create a Supabase client with the Auth context of the function
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    
    // Get current time
    const now = new Date().toISOString();
    
    // Find expired discount codes
    const { data: expiredCodes, error } = await supabaseClient
      .from("discount_codes")
      .select("*")
      .eq("status", "unused")
      .lt("expires_at", now);
      
    if (error) {
      throw error;
    }
    
    console.log(`Found ${expiredCodes.length} expired discount codes`);
    
    // Delete each expired code from Shopify and then from Supabase
    const results = await Promise.all(
      expiredCodes.map(async (code) => {
        try {
          // Delete from Shopify
          await fetch(
            `https://${SHOPIFY_STORE_URL}/admin/api/2023-10/price_rules/${code.price_rule_id}.json`,
            {
              method: "DELETE",
              headers: {
                "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
                "Content-Type": "application/json"
              }
            }
          );
          
          // Delete from Supabase
          const { error: deleteError } = await supabaseClient
            .from("discount_codes")
            .delete()
            .eq("id", code.id);
            
          if (deleteError) throw deleteError;
          
          return { code: code.code, success: true };
        } catch (e) {
          console.error(`Error deleting code ${code.code}:`, e);
          return { code: code.code, success: false, error: e.message };
        }
      })
    );
    
    return new Response(
      JSON.stringify({
        success: true,
        processed: expiredCodes.length,
        results
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});