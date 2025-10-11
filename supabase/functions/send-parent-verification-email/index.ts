import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationRequest {
  parentEmail: string;
  childName: string;
  code: string;
  language?: string;
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

    const { parentEmail, childName, code, language = "en" }: VerificationRequest = await req.json();

    console.log("Sending verification email to:", parentEmail);

    const subjects = {
      en: "Verify Your Child's Vibe Check Account",
      es: "Verifica la cuenta de Vibe Check de tu hijo/a",
      fr: "Vérifiez le compte Vibe Check de votre enfant",
      ar: "تحقق من حساب طفلك في Vibe Check"
    };

    const emailResponse = await resend.emails.send({
      from: "Vibe Check <no-reply@vibecheckapps.com>",
      to: [parentEmail],
      subject: subjects[language as keyof typeof subjects] || subjects.en,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Parent Verification Required</h1>
          <p>Hello,</p>
          <p><strong>${childName}</strong> is setting up a Vibe Check account and needs your verification.</p>
          <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0; font-size: 14px; color: #666;">Your verification code:</p>
            <p style="font-size: 32px; font-weight: bold; color: #333; margin: 10px 0; letter-spacing: 4px;">${code}</p>
          </div>
          <p style="color: #666; font-size: 14px;">This code will expire in 15 minutes.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">Vibe Check - Mental Wellness for All Ages</p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending verification email:", error);
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
