import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CancelRequest {
  requestId?: string;
  cancellationToken?: string;
}

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

    const { requestId, cancellationToken }: CancelRequest = await req.json();

    console.log(`Cancelling data deletion for user ${user.id}`);

    // Build query
    let query = supabase
      .from("data_deletion_requests")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "pending");

    if (requestId) {
      query = query.eq("id", requestId);
    } else if (cancellationToken) {
      query = query.eq("cancellation_token", cancellationToken);
    }

    const { data: deleteRequest, error: fetchError } = await query.single();

    if (fetchError || !deleteRequest) {
      throw new Error("Deletion request not found or already processed");
    }

    // Cancel the deletion request
    const { error: updateError } = await supabase
      .from("data_deletion_requests")
      .update({ status: "cancelled" })
      .eq("id", deleteRequest.id);

    if (updateError) {
      throw updateError;
    }

    // Log analytics event
    await supabase.from("analytics_events").insert({
      user_id: user.id,
      event_type: "data_delete_cancelled",
      event_metadata: { 
        requestId: deleteRequest.id
      },
    });

    console.log("Data deletion cancelled successfully");

    return new Response(JSON.stringify({ 
      success: true,
      message: "Account deletion has been cancelled",
      requestId: deleteRequest.id
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in data-delete-cancel:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
