import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DataDeletionEmailRequest {
  email: string;
  scheduledFor: string;
  status: "scheduled" | "completed";
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

    const { email, scheduledFor, status, language = "en" }: DataDeletionEmailRequest = await req.json();

    console.log("Sending data deletion email to:", email, "status:", status);

    const subjects = {
      scheduled: {
        en: "Your Data Deletion Request Has Been Received",
        es: "Hemos recibido tu solicitud de eliminación de datos",
        fr: "Votre demande de suppression de données a été reçue",
        ar: "تم استلام طلب حذف بياناتك"
      },
      completed: {
        en: "Your Vibe Check Data Has Been Deleted",
        es: "Tus datos de Vibe Check han sido eliminados",
        fr: "Vos données Vibe Check ont été supprimées",
        ar: "تم حذف بيانات Vibe Check الخاصة بك"
      }
    };

    const subject = subjects[status][language as keyof typeof subjects.scheduled] || subjects[status].en;

    let htmlContent = "";

    if (status === "scheduled") {
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Data Deletion Request Received</h1>
          <p>Hello,</p>
          <p>We've received your request to delete your Vibe Check account and data.</p>
          <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; color: #92400E;">
              <strong>⚠️ Important:</strong> Your data will be permanently deleted on ${new Date(scheduledFor).toLocaleDateString()}.
            </p>
          </div>
          <p>You have a 7-day grace period to cancel this request. After that, your data will be permanently deleted and cannot be recovered.</p>
          <p style="color: #666; font-size: 14px;">To cancel this deletion, please log in to your account before the scheduled date.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">Vibe Check - Mental Wellness for All Ages</p>
        </div>
      `;
    } else {
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Your Data Has Been Deleted</h1>
          <p>Hello,</p>
          <p>This confirms that all your Vibe Check data has been permanently deleted as requested.</p>
          <p style="color: #666; font-size: 14px;">The following data has been removed:</p>
          <ul style="color: #666; font-size: 14px;">
            <li>Profile information</li>
            <li>Journal entries and recordings</li>
            <li>Check-in history</li>
            <li>Notification preferences</li>
            <li>All associated records</li>
          </ul>
          <p>Thank you for using Vibe Check. We hope we were able to support your wellness journey.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">Vibe Check - Mental Wellness for All Ages</p>
        </div>
      `;
    }

    const emailResponse = await resend.emails.send({
      from: "Vibe Check <onboarding@resend.dev>",
      to: [email],
      subject: subject,
      html: htmlContent,
    });

    console.log("Data deletion email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending data deletion email:", error);
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
