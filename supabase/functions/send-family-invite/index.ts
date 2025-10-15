import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  inviteeEmail: string;
  inviteeName: string;
  relationship: string;
  inviteCode: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { inviteeEmail, inviteeName, relationship, inviteCode }: InviteRequest = await req.json();

    console.log("[FAMILY-INVITE] Sending invitation to:", inviteeEmail);

    const appUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app") || "https://vibecheck.lovable.app";
    const acceptUrl = `${appUrl}/family/accept?code=${inviteCode}`;

    const emailResponse = await resend.emails.send({
      from: "Vibe Check <onboarding@resend.dev>",
      to: [inviteeEmail],
      subject: "You've been invited to join a family on Vibe Check! 👨‍👩‍👧‍👦",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          
          <div style="background: linear-gradient(135deg, #C0A6FF 0%, #FF9ECD 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">You're Invited! 🎉</h1>
          </div>
          
          <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 18px; margin-top: 0;">Hi ${inviteeName}!</p>
            
            <p style="font-size: 16px; color: #555;">
              Someone special wants to connect with you on <strong>Vibe Check</strong> — a safe, supportive space where families stay connected through chat, stories, and wellness tracking.
            </p>
            
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 24px 0;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                <strong>Relationship:</strong> ${relationship.charAt(0).toUpperCase() + relationship.slice(1)}
              </p>
            </div>
            
            <p style="font-size: 16px; color: #555;">
              By joining, you'll be able to:
            </p>
            
            <ul style="font-size: 15px; color: #555; padding-left: 20px;">
              <li style="margin-bottom: 8px;">💬 Chat privately with your family</li>
              <li style="margin-bottom: 8px;">📸 Share stories and daily updates</li>
              <li style="margin-bottom: 8px;">🌟 Support each other's wellness journey</li>
              <li style="margin-bottom: 8px;">🔒 Keep everything private and secure</li>
            </ul>
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${acceptUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #C0A6FF 0%, #FF9ECD 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Accept Invitation
              </a>
            </div>
            
            <div style="background: #fef3c7; border-left: 4px solid #fbbf24; padding: 16px; border-radius: 4px; margin: 24px 0;">
              <p style="margin: 0; font-size: 14px; color: #92400e;">
                <strong>⏰ This invitation expires in 7 days</strong><br/>
                Don't wait too long to join!
              </p>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 32px;">
              Your invite code: <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${inviteCode}</code>
            </p>
            
            <p style="font-size: 13px; color: #9ca3af; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              If you didn't expect this invitation, you can safely ignore this email. The invitation will expire automatically.
            </p>
          </div>
          
          <div style="text-align: center; padding: 24px; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0;">
              Sent with 💜 from <strong>Vibe Check</strong><br/>
              Your daily wellness companion
            </p>
          </div>
          
        </body>
        </html>
      `,
    });

    console.log("[FAMILY-INVITE] Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("[FAMILY-INVITE] Error:", error);
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