import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

serve(async (req) => {
  try {
    // Create a Supabase client with the Auth context of the function
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    
    // Get used codes that are older than 24 hours
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);
    
    const { data: usedCodes, error } = await supabaseClient
      .from("discount_codes")
      .select("*")
      .eq("status", "used")
      .lt("used_at", yesterday.toISOString());
      
    if (error) {
      throw error;
    }
    
    console.log(`Found ${usedCodes.length} used discount codes older than 24 hours`);
    
    // Delete all matching records
    if (usedCodes.length > 0) {
      const { error: deleteError } = await supabaseClient
        .from("discount_codes")
        .delete()
        .eq("status", "used")
        .lt("used_at", yesterday.toISOString());
        
      if (deleteError) throw deleteError;
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        deleted: usedCodes.length
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