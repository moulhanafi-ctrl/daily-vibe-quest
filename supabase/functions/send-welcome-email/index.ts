import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  user_id: string;
  email: string;
  full_name?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { user_id, email, full_name }: WelcomeEmailRequest = await req.json();

    console.log(`[WELCOME-EMAIL] Sending to ${email} for user ${user_id}`);

    // Log as queued
    await supabase.from("email_logs").insert({
      user_id,
      type: "welcome",
      status: "queued",
      metadata: { email, full_name }
    });

    const fromEmail = Deno.env.get("WELCOME_FROM_EMAIL") || "welcome@daily-vibe-quest.lovable.app";
    const appUrl = supabaseUrl.replace(".supabase.co", ".lovable.app");

    // Send email via Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Daily Vibe Quest <${fromEmail}>`,
        to: [email],
        subject: "Welcome to Daily Vibe Quest! 🎉",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #6366f1;">Welcome${full_name ? `, ${full_name}` : ""}! 🎉</h1>
            <p style="font-size: 16px; line-height: 1.6;">
              We're thrilled to have you join Daily Vibe Quest! Your journey to better mental wellness starts here.
            </p>
            <p style="font-size: 16px; line-height: 1.6;">
              Here's what you can do:
            </p>
            <ul style="font-size: 16px; line-height: 1.6;">
              <li>Check in with your daily mood and journal entries</li>
              <li>Join community chat rooms for support</li>
              <li>Get personalized wellness suggestions</li>
              <li>Track your progress over time</li>
            </ul>
            <div style="margin: 30px 0;">
              <a href="${appUrl}/dashboard" 
                 style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Go to Dashboard
              </a>
            </div>
            <p style="font-size: 14px; color: #666;">
              You can manage your preferences and profile in 
              <a href="${appUrl}/settings" style="color: #6366f1;">Settings</a>.
            </p>
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              Stay well,<br>
              The Daily Vibe Quest Team
            </p>
          </div>
        `,
      }),
    });

    const emailData = await emailResponse.json();
    console.log(`[WELCOME-EMAIL] Sent successfully:`, emailData);

    // Update log as sent
    await supabase.from("email_logs").insert({
      user_id,
      type: "welcome",
      status: "sent",
      metadata: { email, full_name, resend_id: emailData.id }
    });

    return new Response(
      JSON.stringify({ success: true, message: "Welcome email sent" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[WELCOME-EMAIL] Error:", error);

    // Log failure
    const supabase = createClient(supabaseUrl, supabaseKey);
    try {
      const body = await req.json();
      await supabase.from("email_logs").insert({
        user_id: body.user_id,
        type: "welcome",
        status: "failed",
        error: error.message,
        metadata: body
      });
    } catch (e) {
      console.error("[WELCOME-EMAIL] Failed to log error:", e);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});