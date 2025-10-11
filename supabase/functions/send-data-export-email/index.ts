import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DataExportEmailRequest {
  email: string;
  downloadUrl: string;
  expiresAt: string;
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

    const { email, downloadUrl, expiresAt, language = "en" }: DataExportEmailRequest = await req.json();

    console.log("Sending data export email to:", email);

    const subjects = {
      en: "Your Vibe Check Data Export is Ready",
      es: "Tu exportación de datos de Vibe Check está lista",
      fr: "Votre export de données Vibe Check est prêt",
      ar: "تصدير بيانات Vibe Check جاهز"
    };

    const emailResponse = await resend.emails.send({
      from: "Vibe Check <no-reply@vibecheckapps.com>",
      to: [email],
      subject: subjects[language as keyof typeof subjects] || subjects.en,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Your Data Export is Ready</h1>
          <p>Hello,</p>
          <p>Your Vibe Check data export has been prepared and is ready to download.</p>
          <div style="margin: 30px 0;">
            <a href="${downloadUrl}" 
               style="background: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Download Your Data
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">This download link will expire on ${new Date(expiresAt).toLocaleDateString()}.</p>
          <p style="color: #666; font-size: 14px;">Your export includes:</p>
          <ul style="color: #666; font-size: 14px;">
            <li>Profile information</li>
            <li>Journal entries</li>
            <li>Check-in history</li>
            <li>Notification preferences</li>
          </ul>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">Vibe Check - Mental Wellness for All Ages</p>
        </div>
      `,
    });

    console.log("Data export email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending data export email:", error);
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
