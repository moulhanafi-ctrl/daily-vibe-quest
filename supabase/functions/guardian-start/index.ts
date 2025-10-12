import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RequestSchema = z.object({
  guardianEmail: z.string()
    .email("Invalid email format")
    .max(255, "Email too long")
    .trim()
    .toLowerCase(),
  childName: z.string()
    .max(100, "Name too long")
    .trim()
    .optional(),
});

const generateCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const hashCode = async (code: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

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

    // Validate and parse input with zod
    const validatedInput = RequestSchema.parse(await req.json());
    const { guardianEmail, childName } = validatedInput;

    console.log(`Starting guardian verification for child ${user.id}, guardian ${guardianEmail}`);

    // Check rate limiting: max 5 attempts per day per child-email pair
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentAttempts, error: checkError } = await supabase
      .from("guardian_links")
      .select("attempts")
      .eq("child_id", user.id)
      .eq("guardian_email", guardianEmail)
      .gte("created_at", oneDayAgo)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      throw checkError;
    }

    if (recentAttempts && recentAttempts.attempts >= 5) {
      throw new Error("Rate limit exceeded. Please try again tomorrow.");
    }

    // Check throttle: min 60s between sends
    const { data: lastSent } = await supabase
      .from("guardian_links")
      .select("last_sent_at")
      .eq("child_id", user.id)
      .eq("guardian_email", guardianEmail)
      .order("last_sent_at", { ascending: false })
      .limit(1)
      .single();

    if (lastSent?.last_sent_at) {
      const timeSinceLastSend = Date.now() - new Date(lastSent.last_sent_at).getTime();
      if (timeSinceLastSend < 60000) {
        throw new Error(`Please wait ${Math.ceil((60000 - timeSinceLastSend) / 1000)} seconds before resending.`);
      }
    }

    // Generate code and hash
    const code = generateCode();
    const codeHash = await hashCode(code);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    // Upsert guardian_links record
    const { error: upsertError } = await supabase
      .from("guardian_links")
      .upsert({
        child_id: user.id,
        guardian_email: guardianEmail,
        method: "email_code",
        status: "pending",
        code_hash: codeHash,
        code_expires_at: expiresAt,
        last_sent_at: new Date().toISOString(),
        attempts: (recentAttempts?.attempts || 0) + 1,
      }, {
        onConflict: "child_id,guardian_email"
      });

    if (upsertError) {
      throw upsertError;
    }

    // Get user's language preference
    const { data: profile } = await supabase
      .from("profiles")
      .select("language, first_name")
      .eq("id", user.id)
      .single();

    const language = profile?.language || "en";
    const displayName = childName || profile?.first_name || "your child";

    const subjects = {
      en: `Verify your connection to ${displayName}`,
      es: `Verifica tu conexión con ${displayName}`,
      fr: `Vérifiez votre connexion avec ${displayName}`,
      ar: `تحقق من اتصالك بـ ${displayName}`
    };

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Vibe Check <no-reply@vibecheckapps.com>",
      to: [guardianEmail],
      subject: subjects[language as keyof typeof subjects] || subjects.en,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Parent Verification Code</h1>
          <p>Hello,</p>
          <p><strong>${displayName}</strong> is requesting to verify you as their parent/guardian on Vibe Check.</p>
          <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center;">
            <p style="margin: 0; font-size: 14px; color: #666;">Your verification code:</p>
            <p style="font-size: 42px; font-weight: bold; color: #4F46E5; margin: 10px 0; letter-spacing: 8px;">${code}</p>
          </div>
          <p style="color: #666; font-size: 14px;"><strong>This code will expire in 15 minutes.</strong></p>
          <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">Vibe Check - Mental Wellness for All Ages</p>
        </div>
      `,
    });

    console.log("Verification email sent successfully:", emailResponse);

    // Log analytics event
    await supabase.from("analytics_events").insert({
      user_id: user.id,
      event_type: "guardian_code_sent",
      event_metadata: { guardian_email: guardianEmail, method: "email_code" },
    });

    return new Response(JSON.stringify({ 
      success: true,
      message: "Verification code sent to guardian email",
      expiresIn: 900 // 15 minutes in seconds
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in guardian-start:", error);
    
    // Handle zod validation errors
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ 
          ok: false,
          error: "Invalid input format",
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(", ")
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    // Sanitize error messages for production
    const isRateLimit = error.message?.includes("Rate limit") || error.message?.includes("wait");
    const clientMessage = isRateLimit 
      ? error.message 
      : "An error occurred processing your request. Please try again.";
    
    return new Response(
      JSON.stringify({ ok: false, error: clientMessage }),
      {
        status: isRateLimit ? 429 : 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
