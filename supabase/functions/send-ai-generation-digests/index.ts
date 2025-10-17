import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface NotificationPrefs {
  notification_opt_in: boolean;
  notification_channel: 'in_app' | 'email' | 'both';
  notification_timezone: string;
}

async function sendEmailNotification(
  email: string,
  userName: string,
  generations: any[],
  appUrl: string
): Promise<{ success: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const generationsList = generations.slice(0, 3).map((gen, idx) => `
    <div style="margin-bottom: 20px; padding: 15px; background: #f9f9f9; border-radius: 8px;">
      <h3 style="margin: 0 0 8px 0; color: #333;">${idx + 1}. ${gen.title}</h3>
      <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">${gen.summary || 'New AI generation created'}</p>
      ${gen.preview_url ? `<img src="${gen.preview_url}" alt="${gen.title}" style="max-width: 100%; height: auto; border-radius: 4px;" />` : ''}
      <p style="margin: 8px 0 0 0; color: #999; font-size: 12px;">Created ${new Date(gen.created_at).toLocaleString()}</p>
    </div>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; margin-bottom: 10px;">Your New AI Generations (Last 12 Hours)</h2>
        <p style="color: #666; margin-bottom: 20px;">Hi ${userName}, you have ${generations.length} new AI generation${generations.length !== 1 ? 's' : ''} waiting for you!</p>
        
        ${generationsList}
        
        <div style="margin-top: 30px; text-align: center;">
          <a href="${appUrl}/ai/generations?filter=last12h" 
             style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; margin-right: 10px;">
            View All New Generations
          </a>
          <a href="${appUrl}/dashboard" 
             style="display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
            Open App
          </a>
        </div>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center; color: #999; font-size: 12px;">
          <p>You're receiving this because you opted in to AI generation digest notifications.</p>
          <p><a href="${appUrl}/settings?section=notifications" style="color: #2563eb;">Update notification preferences</a></p>
        </div>
      </body>
    </html>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "AI Generations <notifications@resend.dev>",
        to: [email],
        subject: `Your new AI generations (last 12 hours) - ${generations.length} item${generations.length !== 1 ? 's' : ''}`,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Resend API error:", error);
      return { success: false, error: `Resend API error: ${error}` };
    }

    return { success: true };
  } catch (error) {
    console.error("Email send error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body for manual triggers
    const body = await req.json().catch(() => ({}));
    const isManualTrigger = body.manual === true;
    const testUserId = body.testUserId;

    // Calculate time window (last 12 hours)
    const windowEnd = new Date();
    const windowStart = new Date(windowEnd.getTime() - 12 * 60 * 60 * 1000);

    console.log(`Starting AI generation digest job for window: ${windowStart.toISOString()} to ${windowEnd.toISOString()}`);

    // Create job log
    const { data: jobLog, error: jobLogError } = await supabase
      .from("digest_job_logs")
      .insert({
        window_start: windowStart.toISOString(),
        window_end: windowEnd.toISOString(),
        status: "running",
      })
      .select()
      .single();

    if (jobLogError) {
      console.error("Failed to create job log:", jobLogError);
      throw new Error("Failed to create job log");
    }

    // Get active subscribers with notification opt-in
    let subscribersQuery = supabase
      .from("profiles")
      .select("id, username, notification_opt_in, notification_channel, notification_timezone, subscription_status")
      .eq("notification_opt_in", true)
      .in("subscription_status", ["active", "trialing"]);

    // If test user specified, only target that user
    if (testUserId) {
      subscribersQuery = subscribersQuery.eq("id", testUserId);
    }

    const { data: subscribers, error: subsError } = await subscribersQuery;

    if (subsError) {
      console.error("Failed to fetch subscribers:", subsError);
      throw subsError;
    }

    console.log(`Found ${subscribers?.length || 0} eligible subscribers`);

    let usersTargeted = 0;
    let sentCount = 0;
    let errorCount = 0;
    const errorDetails: any[] = [];

    // Process each subscriber
    for (const subscriber of subscribers || []) {
      try {
        // Get user's email
        const { data: userData } = await supabase.auth.admin.getUserById(subscriber.id);
        if (!userData?.user?.email) {
          console.log(`Skipping user ${subscriber.id}: no email found`);
          continue;
        }

        // Get AI generations for this user in the time window
        const { data: generations, error: genError } = await supabase
          .from("ai_generations")
          .select("*")
          .eq("user_id", subscriber.id)
          .gte("created_at", windowStart.toISOString())
          .lte("created_at", windowEnd.toISOString())
          .order("created_at", { ascending: false });

        if (genError) {
          console.error(`Error fetching generations for user ${subscriber.id}:`, genError);
          errorCount++;
          errorDetails.push({ user_id: subscriber.id, error: genError.message });
          continue;
        }

        // Skip if no new generations
        if (!generations || generations.length === 0) {
          console.log(`Skipping user ${subscriber.id}: no new generations`);
          continue;
        }

        usersTargeted++;

        const appUrl = supabaseUrl.replace('/functions/v1', '').replace('https://', 'https://');
        const channel = subscriber.notification_channel || 'both';

        // Send in-app notification
        if (channel === 'in_app' || channel === 'both') {
          const { error: inAppError } = await supabase
            .from("notifications")
            .insert({
              user_id: subscriber.id,
              type: "ai_digest",
              channel: "in_app",
              payload_json: {
                title: `${generations.length} New AI Generation${generations.length !== 1 ? 's' : ''}`,
                message: `You have ${generations.length} new AI generation${generations.length !== 1 ? 's' : ''} from the last 12 hours`,
                generations: generations.slice(0, 3),
                count: generations.length,
                link: "/ai/generations?filter=last12h",
              },
              status: "sent",
            });

          if (inAppError) {
            console.error(`Failed to create in-app notification for ${subscriber.id}:`, inAppError);
            errorCount++;
            errorDetails.push({ user_id: subscriber.id, channel: 'in_app', error: inAppError.message });
          } else {
            sentCount++;
            console.log(`In-app notification sent to user ${subscriber.id}`);
          }
        }

        // Send email notification
        if (channel === 'email' || channel === 'both') {
          const emailResult = await sendEmailNotification(
            userData.user.email,
            subscriber.username || 'there',
            generations,
            appUrl
          );

          if (emailResult.success) {
            await supabase.from("notifications").insert({
              user_id: subscriber.id,
              type: "ai_digest",
              channel: "email",
              payload_json: {
                to: userData.user.email,
                generations_count: generations.length,
              },
              status: "sent",
            });
            sentCount++;
            console.log(`Email sent to user ${subscriber.id}`);
          } else {
            await supabase.from("notifications").insert({
              user_id: subscriber.id,
              type: "ai_digest",
              channel: "email",
              payload_json: {
                to: userData.user.email,
                generations_count: generations.length,
              },
              status: "failed",
              error_msg: emailResult.error,
            });
            errorCount++;
            errorDetails.push({ user_id: subscriber.id, channel: 'email', error: emailResult.error });
            console.error(`Email failed for user ${subscriber.id}:`, emailResult.error);
          }
        }
      } catch (userError) {
        console.error(`Error processing user ${subscriber.id}:`, userError);
        errorCount++;
        const errorMessage = userError instanceof Error ? userError.message : "Unknown error";
        errorDetails.push({ user_id: subscriber.id, error: errorMessage });
      }
    }

    // Update job log
    await supabase
      .from("digest_job_logs")
      .update({
        users_targeted: usersTargeted,
        sent_count: sentCount,
        error_count: errorCount,
        error_details: errorDetails.length > 0 ? errorDetails : null,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobLog.id);

    console.log(`Job completed: ${usersTargeted} users targeted, ${sentCount} sent, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        job_id: jobLog.id,
        users_targeted: usersTargeted,
        sent_count: sentCount,
        error_count: errorCount,
        window: {
          start: windowStart.toISOString(),
          end: windowEnd.toISOString(),
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Digest job error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
