import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY");
const fromEmail = Deno.env.get("FROM_EMAIL") || "support@dailyvibecheck.com";
const appDashboardUrl = Deno.env.get("APP_DASHBOARD_URL") || "https://dailyvibecheck.com/";
const resend = resendApiKey ? new Resend(resendApiKey) : null;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[RESEND-RECEIPT] Function started");

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roles || roles.role !== "admin") {
      throw new Error("Admin access required");
    }

    // Get request body
    const body = await req.json();
    const { session_id, customer_email, product_name, amount_total, currency } = body;

    console.log("[RESEND-RECEIPT] Resending receipt for session:", session_id);

    if (!resend) {
      throw new Error("Resend not configured");
    }

    if (!customer_email) {
      throw new Error("Customer email is required");
    }

    // Send email
    const formattedAmount = (amount_total / 100).toFixed(2);
    const firstName = customer_email.split('@')[0];
    const greeting = firstName || 'friend';

    await resend.emails.send({
      from: `Daily Vibe Check <${fromEmail}>`,
      to: [customer_email],
      subject: "Thank you for your purchase!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Payment successful — thank you for supporting Daily Vibe Check!</h2>
          <p>Hi ${greeting}, your payment was successful.</p>
          
          <ul style="list-style: none; padding: 0;">
            <li style="margin: 10px 0;"><strong>Product:</strong> ${product_name}</li>
            <li style="margin: 10px 0;"><strong>Amount:</strong> $${formattedAmount} ${(currency || "USD").toUpperCase()}</li>
          </ul>
          
          <p style="margin: 20px 0;">
            <a href="${appDashboardUrl}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Open your dashboard</a>
          </p>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            If you have questions, just reply to this email.
          </p>
        </div>
      `,
    });

    console.log("[RESEND-RECEIPT] Email sent to:", customer_email);

    // Update emailed flag in database
    const { error: updateError } = await supabase
      .from("orders")
      .update({ emailed: true })
      .eq("session_id", session_id);

    if (updateError) {
      console.error("[RESEND-RECEIPT] Error updating emailed flag:", updateError);
    } else {
      console.log("[RESEND-RECEIPT] Updated emailed flag for session:", session_id);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Receipt resent successfully" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[RESEND-RECEIPT] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.message === "Admin access required" ? 403 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
