import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Resend API for email fallback
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

interface NotificationPrefs {
  user_id: string;
  email: string;
  daily_enabled: boolean;
  daily_time: string;
  timezone: string;
  quiet_hours: any; // JSONB field with { enabled, start, end }
}

// Check if current time is within quiet hours
function isInQuietHours(
  currentTime: Date,
  quietHours: any,
  timezone: string
): boolean {
  try {
    if (!quietHours || !quietHours.enabled) return false;

    const userTime = new Date(currentTime.toLocaleString('en-US', { timeZone: timezone }));
    const currentHour = userTime.getHours();
    const currentMinute = userTime.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    const [startHour, startMin] = (quietHours.start || '22:00').split(':').map(Number);
    const [endHour, endMin] = (quietHours.end || '07:00').split(':').map(Number);
    const startInMinutes = startHour * 60 + startMin;
    const endInMinutes = endHour * 60 + endMin;

    if (startInMinutes < endInMinutes) {
      // Normal case: 22:00 - 07:00 next day
      return currentTimeInMinutes >= startInMinutes || currentTimeInMinutes < endInMinutes;
    } else {
      // Quiet hours within same day
      return currentTimeInMinutes >= startInMinutes && currentTimeInMinutes < endInMinutes;
    }
  } catch (error) {
    console.error('Error checking quiet hours:', error);
    return false;
  }
}

// Send push notification
async function sendPushNotification(
  supabase: any,
  userId: string,
  title: string,
  body: string,
  url: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        user_id: userId,
        title,
        body,
        url,
        icon: '/icon-512.png',
        badge: '/icon-512.png',
        tag: 'daily-notification',
      },
    });

    if (error) {
      console.error('Push notification error:', error);
      return { success: false, error: error.message };
    }

    return { success: (data?.sent || 0) > 0 };
  } catch (error) {
    console.error('Failed to send push:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Send email notification using Resend API
async function sendEmailNotification(
  email: string,
  title: string,
  body: string,
  url: string
): Promise<{ success: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    return { success: false, error: 'Resend API key not configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Vibe Check <notifications@daily-vibe-quest.lovable.app>',
        to: [email],
        subject: title,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">${title}</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.5;">${body}</p>
            <a href="${url}" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 6px;">
              Open App
            </a>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              You received this because you have daily notifications enabled. 
              <a href="${url}/settings?tab=notifications" style="color: #6366f1;">Update preferences</a>
            </p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Email error:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🚀 Starting daily notification job...');

    // Get current day of week (0=Sunday, 6=Saturday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    console.log(`📅 Today is day ${dayOfWeek}`);

    // Get today's message
    const { data: message, error: messageError } = await supabaseAdmin
      .from('daily_messages')
      .select('*')
      .eq('day_of_week', dayOfWeek)
      .eq('active', true)
      .single();

    if (messageError || !message) {
      console.error('No message found for today:', messageError);
      return new Response(
        JSON.stringify({ error: 'No message configured for today' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log(`📝 Message: ${message.message_title}`);

    // Get all users with daily notifications enabled
    const { data: users, error: usersError } = await supabaseAdmin
      .from('notification_prefs')
      .select('user_id, quiet_hours, timezone')
      .eq('daily_enabled', true);

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    if (!users || users.length === 0) {
      console.log('No users with daily notifications enabled');
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No users to notify' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log(`👥 Found ${users.length} users with daily notifications enabled`);

    // Get user emails
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) {
      throw new Error(`Failed to fetch user emails: ${authError.message}`);
    }

    const emailMap = new Map(authUsers.users.map(u => [u.id, u.email]));

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    // Check if user already received notification today (prevent duplicates)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const { data: existingLogs } = await supabaseAdmin
      .from('notification_logs')
      .select('user_id')
      .eq('notification_type', 'daily_motivation')
      .gte('sent_at', todayStart.toISOString());

    const alreadySentSet = new Set((existingLogs || []).map(log => log.user_id));

    // Send notifications
    for (const user of users) {
      try {
        // Skip if already sent today
        if (alreadySentSet.has(user.user_id)) {
          console.log(`⏭️  Skipping user ${user.user_id} - already notified today`);
          skipped++;
          continue;
        }

        // Check quiet hours
        const quietHours = user.quiet_hours;
        if (quietHours && quietHours.enabled) {
          const inQuietHours = isInQuietHours(now, quietHours, user.timezone);

          if (inQuietHours) {
            console.log(`🌙 Skipping user ${user.user_id} - in quiet hours`);
            skipped++;
            continue;
          }
        }

        const email = emailMap.get(user.user_id);
        if (!email) {
          console.warn(`⚠️  No email found for user ${user.user_id}`);
          failed++;
          continue;
        }

        const appUrl = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || '';
        const deepLinkUrl = `${appUrl}${message.deep_link_url}`;

        // Try push notification first
        const pushResult = await sendPushNotification(
          supabaseAdmin,
          user.user_id,
          message.message_title,
          message.message_body,
          deepLinkUrl
        );

        let channel = 'push';
        let status = 'sent';
        let errorMessage = null;

        // If push failed, try email fallback
        if (!pushResult.success) {
          console.log(`📧 Push failed for ${user.user_id}, trying email fallback`);
          const emailResult = await sendEmailNotification(
            email,
            message.message_title,
            message.message_body,
            deepLinkUrl
          );

          if (emailResult.success) {
            channel = 'email';
            status = 'sent';
          } else {
            channel = 'both';
            status = 'failed';
            errorMessage = `Push: ${pushResult.error}, Email: ${emailResult.error}`;
          }
        }

        // Log the notification
        await supabaseAdmin.from('notification_logs').insert({
          user_id: user.user_id,
          message_id: message.id,
          notification_type: 'daily_motivation',
          channel,
          status,
          error_message: errorMessage,
          metadata: {
            day_of_week: dayOfWeek,
            message_title: message.message_title,
          },
        });

        if (status === 'sent') {
          sent++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`Error processing user ${user.user_id}:`, error);
        failed++;
      }
    }

    console.log(`✅ Complete: ${sent} sent, ${skipped} skipped, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent,
        skipped,
        failed,
        total: users.length,
        message: message.message_title,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in send-daily-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
