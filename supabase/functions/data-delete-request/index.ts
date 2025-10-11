import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DELETE_GRACE_DAYS = 7;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    console.log(`Data deletion requested by user ${user.id}`);

    // Check for existing pending deletion
    const { data: existingRequest } = await supabase
      .from("data_deletion_requests")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("requested_at", { ascending: false })
      .limit(1)
      .single();

    if (existingRequest) {
      return new Response(JSON.stringify({ 
        success: true,
        message: "Deletion request already pending",
        requestId: existingRequest.id,
        scheduledFor: existingRequest.grace_period_ends_at,
        cancellationToken: existingRequest.cancellation_token
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const gracePeriodEnds = new Date(Date.now() + DELETE_GRACE_DAYS * 24 * 60 * 60 * 1000);

    // Create deletion request
    const { data: deleteRequest, error: insertError } = await supabase
      .from("data_deletion_requests")
      .insert({
        user_id: user.id,
        status: "pending",
        grace_period_ends_at: gracePeriodEnds.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // Get user language for email
    const { data: profile } = await supabase
      .from("profiles")
      .select("language")
      .eq("id", user.id)
      .single();

    const language = profile?.language || "en";

    // Send notification email
    await supabase.functions.invoke("send-data-deletion-email", {
      body: {
        email: user.email,
        scheduledFor: gracePeriodEnds.toISOString(),
        status: "scheduled",
        language: language
      }
    });

    // Log analytics event
    await supabase.from("analytics_events").insert({
      user_id: user.id,
      event_type: "data_delete_scheduled",
      event_metadata: { 
        requestId: deleteRequest.id,
        scheduledFor: gracePeriodEnds.toISOString(),
        graceDays: DELETE_GRACE_DAYS
      },
    });

    console.log("Data deletion scheduled successfully");

    return new Response(JSON.stringify({ 
      success: true,
      message: `Account deletion scheduled in ${DELETE_GRACE_DAYS} days`,
      requestId: deleteRequest.id,
      scheduledFor: gracePeriodEnds.toISOString(),
      cancellationToken: deleteRequest.cancellation_token
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in data-delete-request:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
