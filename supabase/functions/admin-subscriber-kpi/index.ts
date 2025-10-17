import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get the JWT token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (roleError || !roleData) {
      console.error("[ADMIN-SUBSCRIBER-KPI] Non-admin access attempt:", user.id);
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[ADMIN-SUBSCRIBER-KPI] Fetching subscriber KPIs");

    // Execute the KPI query
    const { data, error } = await supabase.rpc('get_subscriber_kpi');

    if (error) {
      console.error("[ADMIN-SUBSCRIBER-KPI] RPC error, falling back to direct query:", error);
      
      // Fallback to direct query if RPC doesn't exist
      const { data: pushSubs, error: queryError } = await supabase
        .from("push_subscriptions")
        .select("user_id, created_at");

      if (queryError) throw queryError;

      const uniqueUsers = new Set(pushSubs?.map(s => s.user_id) || []);
      const totalPush = uniqueUsers.size;

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const newUsers = new Set(
        pushSubs?.filter(s => new Date(s.created_at) >= sevenDaysAgo)
          .map(s => s.user_id) || []
      );
      const weeklyDelta = newUsers.size;

      return new Response(
        JSON.stringify({
          total_push: totalPush,
          weekly_delta: weeklyDelta,
          as_of: new Date().toISOString()
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Cache-Control": "max-age=300", // 5 minutes
          },
        }
      );
    }

    // If RPC exists and succeeds
    const result = data?.[0] || { total_push: 0, weekly_delta: 0 };
    
    return new Response(
      JSON.stringify({
        total_push: result.total_push || 0,
        weekly_delta: result.weekly_delta || 0,
        as_of: new Date().toISOString()
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "max-age=300",
        },
      }
    );
  } catch (error: any) {
    console.error("[ADMIN-SUBSCRIBER-KPI] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
