import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { verifyHmacSignature } from "../_shared/hmac-validation.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
};

interface NotificationRequest {
  type: 'reminder' | 'start'; // 6:50 PM reminder or 7:00 PM start
  week_key?: string; // Optional override, defaults to next Saturday
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // SECURITY: Verify HMAC signature for cron-triggered function
  if (!await verifyHmacSignature(req)) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized: Invalid signature' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body: NotificationRequest = await req.json();
    const notificationType = body.type || 'start';

    console.log(`[TRIVIA-NOTIFY] Processing ${notificationType} notifications`);

    // Calculate week key (next Saturday)
    const detroitTime = new Date().toLocaleString('en-US', { timeZone: 'America/Detroit' });
    const now = new Date(detroitTime);
    const daysUntilSaturday = (6 - now.getDay() + 7) % 7 || 7;
    const nextSaturday = new Date(now);
    nextSaturday.setDate(now.getDate() + daysUntilSaturday);
    const weekKey = body.week_key || nextSaturday.toISOString().split('T')[0];

    // Get current time for quiet hours check
    const scheduledAt = new Date();

    // Get eligible users using database function
    const { data: eligibleUsers, error: usersError } = await supabase
      .rpc('get_trivia_notification_users', {
        p_notification_type: notificationType,
        p_scheduled_time: scheduledAt.toISOString()
      });

    if (usersError) throw usersError;

    if (!eligibleUsers || eligibleUsers.length === 0) {
      console.log('[TRIVIA-NOTIFY] No eligible users found');
      await logNotificationMetrics(supabase, weekKey, notificationType, scheduledAt, {
        totalUsers: 0,
        pushSent: 0,
        emailSent: 0
      });
      return new Response(
        JSON.stringify({ success: true, message: 'No eligible users', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`[TRIVIA-NOTIFY] Found ${eligibleUsers.length} eligible users`);

    // Prepare notification content
    const notifications = {
      reminder: {
        title: '🎯 Trivia kicks off in 10 minutes!',
        body: 'Warm up and gather the family — Round 1 starts at 7:00 PM!',
        emailSubject: '⏰ Saturday Trivia Reminder',
        emailHtml: (userEmail: string) => `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #6366f1;">🎯 Trivia Time!</h1>
            <p style="font-size: 18px; color: #333;">Hey there!</p>
            <p style="font-size: 16px; color: #555;">
              Just a quick heads up — Saturday Trivia kicks off in <strong>10 minutes</strong> at 7:00 PM!
            </p>
            <p style="font-size: 16px; color: #555;">
              Gather the family, grab a snack, and get ready for 30 fun questions across 3 sessions! 🧠✨
            </p>
            <a href="${Deno.env.get('VITE_SUPABASE_URL')}/trivia?week=${weekKey}" 
               style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold;">
              🎮 Play Now
            </a>
            <p style="font-size: 14px; color: #999; margin-top: 30px;">
              <a href="${Deno.env.get('VITE_SUPABASE_URL')}/settings" style="color: #6366f1;">Manage notification preferences</a>
            </p>
          </div>
        `
      },
      start: {
        title: '🎉 Round 1 is LIVE!',
        body: 'Saturday Trivia has started — tap to play now!',
        emailSubject: '🎮 Saturday Trivia is LIVE',
        emailHtml: (userEmail: string) => `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #22c55e;">🎉 It's Trivia Time!</h1>
            <p style="font-size: 18px; color: #333;">Round 1 is now LIVE! 🚀</p>
            <p style="font-size: 16px; color: #555;">
              This week's topics: General Knowledge, Science & History
            </p>
            <p style="font-size: 16px; color: #555;">
              • 3 Sessions × 10 Questions<br>
              • Wellness breaks between sessions<br>
              • Leaderboards & family mode
            </p>
            <a href="${Deno.env.get('VITE_SUPABASE_URL')}/trivia?week=${weekKey}" 
               style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold;">
              🎯 Start Playing
            </a>
            <p style="font-size: 14px; color: #999; margin-top: 30px;">
              <a href="${Deno.env.get('VITE_SUPABASE_URL')}/settings" style="color: #22c55e;">Manage notification preferences</a>
            </p>
          </div>
        `
      }
    };

    const content = notifications[notificationType];
    const deepLink = `trivia://sessions?week=${weekKey}`;
    const webFallback = `/trivia?week=${weekKey}`;

    // Metrics tracking
    let pushSent = 0, pushDelivered = 0, pushErrors = 0;
    let emailSent = 0, emailDelivered = 0, emailErrors = 0;
    let quietHoursSkipped = 0;
    const errorDetails: any[] = [];

    // Send notifications
    for (const user of eligibleUsers) {
      const inQuietHours = user.in_quiet_hours || false;

      // Skip push if in quiet hours
      if (inQuietHours) {
        quietHoursSkipped++;
        console.log(`[TRIVIA-NOTIFY] Skipping push for ${user.email} (quiet hours)`);
      } else if (user.push_enabled) {
        // Send push notification
        try {
          const { data: pushResult, error: pushError } = await supabase.functions.invoke('send-push-notification', {
            body: {
              user_id: user.user_id,
              title: content.title,
              body: content.body,
              url: webFallback,
              icon: '/icon-512.png',
              badge: '/icon-512-maskable.png',
              tag: `trivia-${notificationType}-${weekKey}`,
              data: {
                type: 'trivia',
                notification_type: notificationType,
                week_key: weekKey,
                deep_link: deepLink,
                web_fallback: webFallback
              }
            }
          });

          if (pushError) throw pushError;
          pushSent += pushResult.sent || 0;
          pushDelivered += pushResult.sent || 0; // Assume delivered if sent
        } catch (error) {
          pushErrors++;
          errorDetails.push({
            user_id: user.user_id,
            channel: 'push',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          console.error(`[TRIVIA-NOTIFY] Push error for ${user.email}:`, error);
        }
      }

      // Send email if enabled and has Resend API key
      if (user.email_enabled && user.email && resendApiKey) {
        try {
          // Use Resend API directly via fetch
          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Vibe Check <trivia@updates.vibecheck.app>',
              to: [user.email],
              subject: content.emailSubject,
              html: content.emailHtml(user.email)
            })
          });

          if (!emailResponse.ok) {
            const errorData = await emailResponse.text();
            throw new Error(`Resend API error: ${errorData}`);
          }

          emailSent++;
          emailDelivered++; // Assume delivered if accepted by Resend
        } catch (error) {
          emailErrors++;
          errorDetails.push({
            user_id: user.user_id,
            channel: 'email',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          console.error(`[TRIVIA-NOTIFY] Email error for ${user.email}:`, error);
        }
      }
    }

    // Log metrics
    await logNotificationMetrics(supabase, weekKey, notificationType, scheduledAt, {
      totalUsers: eligibleUsers.length,
      pushSent,
      pushDelivered,
      pushErrors,
      emailSent,
      emailDelivered,
      emailErrors,
      quietHoursSkipped,
      errorDetails
    });

    // Log to trivia_logs
    await supabase.from('trivia_logs').insert({
      week_key: weekKey,
      event_type: 'notification',
      status: (pushErrors + emailErrors) === 0 ? 'success' : 'warning',
      message: `Sent ${notificationType} notifications: ${pushSent} push, ${emailSent} email`,
      metadata: {
        notification_type: notificationType,
        total_users: eligibleUsers.length,
        push_sent: pushSent,
        email_sent: emailSent,
        errors: pushErrors + emailErrors
      },
      function_name: 'send-trivia-notifications'
    });

    console.log(`[TRIVIA-NOTIFY] Complete: ${pushSent} push, ${emailSent} email sent`);

    return new Response(
      JSON.stringify({
        success: true,
        week_key: weekKey,
        notification_type: notificationType,
        metrics: {
          total_users: eligibleUsers.length,
          push_sent: pushSent,
          push_delivered: pushDelivered,
          email_sent: emailSent,
          email_delivered: emailDelivered,
          quiet_hours_skipped: quietHoursSkipped,
          errors: pushErrors + emailErrors
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('[TRIVIA-NOTIFY] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function logNotificationMetrics(
  supabase: any,
  weekKey: string,
  notificationType: string,
  scheduledAt: Date,
  metrics: any
) {
  await supabase.from('trivia_notification_logs').insert({
    week_key: weekKey,
    notification_type: notificationType,
    total_users: metrics.totalUsers || 0,
    push_sent: metrics.pushSent || 0,
    push_delivered: metrics.pushDelivered || 0,
    push_errors: metrics.pushErrors || 0,
    email_sent: metrics.emailSent || 0,
    email_delivered: metrics.emailDelivered || 0,
    email_errors: metrics.emailErrors || 0,
    quiet_hours_skipped: metrics.quietHoursSkipped || 0,
    error_details: metrics.errorDetails || [],
    scheduled_at: scheduledAt.toISOString()
  });
}
