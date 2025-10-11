import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXPORT_EXPIRY_HOURS = 72;

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

    console.log(`Data export requested by user ${user.id}`);

    // Check for existing pending/processing requests
    const { data: existingRequest } = await supabase
      .from("data_export_requests")
      .select("id, status, created_at")
      .eq("user_id", user.id)
      .in("status", ["pending", "processing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (existingRequest) {
      return new Response(JSON.stringify({ 
        success: true,
        message: "Export request already in progress",
        requestId: existingRequest.id,
        status: existingRequest.status
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Gather user data (synchronously for now - could be moved to background job)
    const [profile, journals, moods, notifications] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("journal_entries").select("*").eq("user_id", user.id),
      supabase.from("moods").select("*").eq("user_id", user.id),
      supabase.from("parent_notification_preferences").select("*").eq("parent_id", user.id),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      userId: user.id,
      email: user.email,
      profile: profile.data,
      journals: {
        count: journals.data?.length || 0,
        entries: journals.data || []
      },
      moods: {
        count: moods.data?.length || 0,
        entries: moods.data || []
      },
      notificationPreferences: notifications.data,
    };

    // Create export file in storage
    const fileName = `${user.id}/export_${Date.now()}.json`;
    const { error: uploadError } = await supabase.storage
      .from("data-exports")
      .upload(fileName, JSON.stringify(exportData, null, 2), {
        contentType: "application/json",
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    // Create signed URL (expires in 72 hours)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from("data-exports")
      .createSignedUrl(fileName, EXPORT_EXPIRY_HOURS * 3600);

    if (urlError) {
      throw urlError;
    }

    const expiresAt = new Date(Date.now() + EXPORT_EXPIRY_HOURS * 3600 * 1000).toISOString();

    // Create export request record
    const { data: exportRequest, error: insertError } = await supabase
      .from("data_export_requests")
      .insert({
        user_id: user.id,
        status: "ready",
        download_url: signedUrlData.signedUrl,
        expires_at: expiresAt,
        completed_at: new Date().toISOString(),
        file_path: fileName
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // Get user language for email
    const language = profile.data?.language || "en";

    // Send notification email
    await supabase.functions.invoke("send-data-export-email", {
      body: {
        email: user.email,
        downloadUrl: signedUrlData.signedUrl,
        expiresAt: expiresAt,
        language: language
      }
    });

    // Log analytics event
    await supabase.from("analytics_events").insert({
      user_id: user.id,
      event_type: "data_export_ready",
      event_metadata: { 
        requestId: exportRequest.id,
        entriesCount: journals.data?.length || 0
      },
    });

    console.log("Data export completed successfully");

    return new Response(JSON.stringify({ 
      success: true,
      message: "Data export is ready",
      requestId: exportRequest.id,
      downloadUrl: signedUrlData.signedUrl,
      expiresAt: expiresAt
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in data-export-request:", error);
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
