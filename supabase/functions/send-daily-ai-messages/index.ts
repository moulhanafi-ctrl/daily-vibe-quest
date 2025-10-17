import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

async function generateAIMessage(
  userName: string,
  moodContext?: string
): Promise<string> {
  const contextPrompt = moodContext
    ? `The user ${userName} recently shared: ${moodContext}. Acknowledge their journey with empathy.`
    : `Generate a warm message for ${userName}.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: "You are Mostapha, a warm and supportive wellness companion. Generate exactly 2 short, uplifting sentences (≤35 words total) that are positive, encouraging, and hopeful. Keep it simple, warm, and non-clinical. Vary your messages to avoid repetition. Personalize based on the user's context when provided."
        },
        {
          role: "user",
          content: contextPrompt
        }
      ],
      max_tokens: 100,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI generation failed: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

async function sendEmailNotification(
  email: string,
  userName: string,
  personalizedGreeting: string,
  message: string,
  appUrl: string
): Promise<{ success: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="color: #333; margin-bottom: 5px;">${personalizedGreeting}</h2>
          <p style="color: #666; font-size: 16px; margin-top: 5px;">Your message is ready to be viewed.</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p style="color: #333; font-size: 15px; line-height: 1.8; margin: 0;">${message}</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${appUrl}/dashboard" 
             style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
            Open App
          </a>
        </div>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center; color: #999; font-size: 12px;">
          <p>You're receiving this because you opted in to daily wellness messages.</p>
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
        from: "Mostapha <notifications@resend.dev>",
        to: [email],
        subject: "💌 Message from Mostapha",
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
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
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

    const body = await req.json().catch(() => ({}));
    const windowType = body.windowType || "scheduled"; // 'morning', 'evening', 'kickoff', 'manual'
    const testUserId = body.testUserId;

    console.log(`Starting daily AI message job - window: ${windowType}`);

    // Create job log
    const { data: jobLog, error: jobLogError } = await supabase
      .from("daily_ai_message_logs")
      .insert({
        window_type: windowType,
        status: "running",
      })
      .select()
      .single();

    if (jobLogError) {
      console.error("Failed to create job log:", jobLogError);
      throw new Error("Failed to create job log");
    }

    // Get eligible users
    let usersQuery = supabase
      .from("profiles")
      .select("id, username, notification_opt_in, notification_channel, notification_timezone, subscription_status")
      .eq("notification_opt_in", true);

    if (testUserId) {
      usersQuery = usersQuery.eq("id", testUserId);
    }

    const { data: users, error: usersError } = await usersQuery;

    if (usersError) {
      console.error("Failed to fetch users:", usersError);
      throw usersError;
    }

    console.log(`Found ${users?.length || 0} eligible users`);

    let usersTargeted = 0;
    let sentCount = 0;
    let errorCount = 0;
    const errorDetails: any[] = [];

    for (const user of users || []) {
      try {
        const { data: userData } = await supabase.auth.admin.getUserById(user.id);
        if (!userData?.user?.email) {
          console.log(`Skipping user ${user.id}: no email found`);
          continue;
        }

        usersTargeted++;

        // Extract first name from username or email
        let firstName = user.username || 'there';
        if (firstName.includes('@')) {
          // If username is email, extract name before @
          firstName = firstName.split('@')[0];
        }
        // Capitalize first letter
        firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

        // Get recent mood context (last 7 days)
        let moodContext = '';
        try {
          const { data: recentMoods } = await supabase
            .from("mood_check_ins")
            .select("mood, note")
            .eq("user_id", user.id)
            .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .order("created_at", { ascending: false })
            .limit(3);

          if (recentMoods && recentMoods.length > 0) {
            const moods = recentMoods.map(m => m.mood).filter(Boolean);
            const notes = recentMoods.map(m => m.note).filter(Boolean);
            if (moods.length > 0) {
              moodContext = `Recent mood: ${moods[0]}`;
              if (notes.length > 0 && notes[0]) {
                moodContext += `. They shared: "${notes[0].substring(0, 100)}"`;
              }
            }
          }
        } catch (moodError) {
          console.log(`Could not fetch mood data for ${user.id}:`, moodError);
        }

        // Generate personalized AI message for this user
        const aiMessage = await generateAIMessage(firstName, moodContext);
        const personalizedGreeting = `💌 Hi ${firstName}, Mostapha here ❤️`;
        const fullMessage = `${personalizedGreeting}\nYour message is ready to be viewed.\n\n${aiMessage}`;

        const appUrl = supabaseUrl.replace('/functions/v1', '');
        const channel = user.notification_channel || 'both';

        // Send in-app notification
        if (channel === 'in_app' || channel === 'both') {
          const { error: inAppError } = await supabase
            .from("notifications")
            .insert({
              user_id: user.id,
              type: "daily_ai_message",
              channel: "in_app",
              payload_json: {
                title: personalizedGreeting,
                message: `Your message is ready to be viewed.\n\n${aiMessage}`,
                link: "/dashboard",
              },
              status: "sent",
            });

          if (inAppError) {
            console.error(`Failed to create in-app notification for ${user.id}:`, inAppError);
            errorCount++;
            errorDetails.push({ user_id: user.id, channel: 'in_app', error: inAppError.message });
          } else {
            sentCount++;
            console.log(`In-app notification sent to user ${user.id}`);
          }
        }

        // Send email notification
        if (channel === 'email' || channel === 'both') {
          const emailResult = await sendEmailNotification(
            userData.user.email,
            firstName,
            personalizedGreeting,
            aiMessage,
            appUrl
          );

          if (emailResult.success) {
            await supabase.from("notifications").insert({
              user_id: user.id,
              type: "daily_ai_message",
              channel: "email",
              payload_json: {
                to: userData.user.email,
                message: fullMessage,
              },
              status: "sent",
            });
            sentCount++;
            console.log(`Email sent to user ${user.id}`);
          } else {
            await supabase.from("notifications").insert({
              user_id: user.id,
              type: "daily_ai_message",
              channel: "email",
              payload_json: {
                to: userData.user.email,
                message: fullMessage,
              },
              status: "failed",
              error_msg: emailResult.error,
            });
            errorCount++;
            errorDetails.push({ user_id: user.id, channel: 'email', error: emailResult.error });
          }
        }
      } catch (userError) {
        console.error(`Error processing user ${user.id}:`, userError);
        errorCount++;
        errorDetails.push({ 
          user_id: user.id, 
          error: userError instanceof Error ? userError.message : "Unknown error" 
        });
      }
    }

    // Update job log
    await supabase
      .from("daily_ai_message_logs")
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
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Daily AI message job error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
