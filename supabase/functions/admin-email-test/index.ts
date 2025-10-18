import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
    const fromDisplay = Deno.env.get("RESEND_FROM_DISPLAY") || "Daily Vibe Check";

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ ok: false, code: "missing_api_key", message: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!fromEmail) {
      return new Response(
        JSON.stringify({ ok: false, code: "missing_from_email", message: "RESEND_FROM_EMAIL not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { to } = await req.json();
    if (!to) {
      return new Response(
        JSON.stringify({ ok: false, code: "missing_recipient", message: "Recipient email required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const from = `${fromDisplay} <${fromEmail}>`;

    console.log(`[TEST-EMAIL] Sending test email to ${to} from ${from}`);

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: "Resend Test – Daily Vibe Check",
          text: "This is a test from Daily Vibe Check. If you received this email, your email configuration is working correctly!",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("[TEST-EMAIL] Resend API error:", response.status, result);

        // Map Resend errors to user-friendly messages
        let code = "unknown_error";
        let message = result.message || "Unknown error";
        let statusCode = response.status;

        if (response.status === 401 || response.status === 403) {
          code = "invalid_api_key";
          message = "Invalid/unauthorized API key";
        } else if (response.status === 422) {
          code = "invalid_from_address";
          message = "Invalid 'from' address format";
        } else if (response.status === 429) {
          code = "rate_limited";
          message = "Rate limited by Resend";
        } else if (response.status >= 500) {
          code = "resend_service_issue";
          message = "Resend service issue";
          statusCode = 503;
        }

        return new Response(
          JSON.stringify({ ok: false, code, message, details: result.message || result.error }),
          { status: statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[TEST-EMAIL] Success:`, result);

      return new Response(
        JSON.stringify({ ok: true, id: result.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (error: any) {
      console.error("[TEST-EMAIL] Network error:", error);
      
      return new Response(
        JSON.stringify({ ok: false, code: "network_error", message: "Network error contacting Resend", details: error.message }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: any) {
    console.error("[TEST-EMAIL] Unexpected error:", error);
    return new Response(
      JSON.stringify({ ok: false, code: "internal_error", message: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
