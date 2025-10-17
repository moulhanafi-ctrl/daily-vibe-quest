import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { Resend } from 'https://esm.sh/resend@2.0.0';
import { verifyHmacSignature } from "../_shared/hmac-validation.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

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

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Saturday Trivia notification job started');

    // Get all users with trivia preferences enabled
    const { data: users, error: usersError } = await supabaseClient
      .from('profiles')
      .select(`
        id,
        username,
        age_group,
        language,
        trivia_preferences (
          enabled,
          notifications_enabled,
          timezone
        ),
        parent_notification_preferences (
          quiet_hours_start,
          quiet_hours_end
        )
      `)
      .eq('trivia_preferences.enabled', true)
      .eq('trivia_preferences.notifications_enabled', true);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    console.log(`Found ${users?.length || 0} users to notify`);

    // Get today's Saturday date
    const now = new Date();
    const saturdayStr = now.toISOString().split('T')[0];

    // Check if rounds exist for today
    const { data: rounds } = await supabaseClient
      .from('trivia_rounds')
      .select('id, age_group')
      .eq('date', saturdayStr);

    if (!rounds || rounds.length === 0) {
      console.log('No rounds scheduled for today');
      return new Response(
        JSON.stringify({ message: 'No rounds scheduled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const roundsByAge = rounds.reduce((acc, r) => {
      acc[r.age_group] = r.id;
      return acc;
    }, {} as Record<string, string>);

    let notificationsSent = 0;
    let errors = 0;

    for (const user of users || []) {
      try {
        const roundId = roundsByAge[user.age_group];
        if (!roundId) {
          console.log(`No round for age group ${user.age_group}`);
          continue;
        }

        // Check if already played
        const { data: progress } = await supabaseClient
          .from('trivia_progress')
          .select('id')
          .eq('user_id', user.id)
          .eq('round_id', roundId)
          .single();

        if (progress) {
          console.log(`User ${user.id} already played`);
          continue;
        }

        // Check quiet hours
        const quietHours = user.parent_notification_preferences?.[0];
        if (quietHours) {
          const currentHour = now.getHours();
          const quietStart = parseInt(quietHours.quiet_hours_start?.split(':')[0] || '21');
          const quietEnd = parseInt(quietHours.quiet_hours_end?.split(':')[0] || '7');
          
          if (currentHour >= quietStart || currentHour < quietEnd) {
            console.log(`User ${user.id} in quiet hours`);
            continue;
          }
        }

        // Get user email
        const { data: authUser } = await supabaseClient.auth.admin.getUserById(user.id);
        if (!authUser?.user?.email) {
          console.log(`No email for user ${user.id}`);
          continue;
        }

        // Localized messages
        const messages: Record<string, any> = {
          en: {
            subject: 'Saturday Trivia is Live! 🎉',
            body: `Hi ${user.username},\n\nSaturday Trivia is ready to play! 5 quick questions about feelings, coping, and connection.\n\nPlay together: https://your-app.com/trivia\n\nHave fun!\n— The Vibe Check Team`,
          },
          es: {
            subject: '¡El Trivia del Sábado está en vivo! 🎉',
            body: `Hola ${user.username},\n\n¡El Trivia del Sábado está listo para jugar! 5 preguntas rápidas sobre sentimientos, afrontamiento y conexión.\n\nJuega juntos: https://your-app.com/trivia\n\n¡Diviértete!\n— El equipo de Vibe Check`,
          },
          fr: {
            subject: 'Le Trivia du Samedi est en direct! 🎉',
            body: `Bonjour ${user.username},\n\nLe Trivia du Samedi est prêt à jouer! 5 questions rapides sur les sentiments, l'adaptation et la connexion.\n\nJouez ensemble: https://your-app.com/trivia\n\nAmusez-vous bien!\n— L'équipe Vibe Check`,
          },
          ar: {
            subject: 'مسابقة السبت مباشرة! 🎉',
            body: `مرحبا ${user.username},\n\nمسابقة السبت جاهزة للعب! 5 أسئلة سريعة حول المشاعر والتأقلم والتواصل.\n\nالعب معًا: https://your-app.com/trivia\n\nاستمتع!\n— فريق Vibe Check`,
          },
        };

        const locale = user.language || 'en';
        const message = messages[locale] || messages.en;

        // Send notification
        await resend.emails.send({
          from: 'Daily Vibe Check <no-reply@dailyvibecheck.com>',
          to: [authUser.user.email],
          subject: message.subject,
          text: message.body,
        });

        // Track event
        await supabaseClient.from('analytics_events').insert({
          user_id: user.id,
          event_type: 'notif_trivia_sent',
          event_metadata: { round_id: roundId, locale },
          language: locale,
        });

        notificationsSent++;
        console.log(`Notification sent to ${user.id}`);
      } catch (error) {
        console.error(`Error notifying user ${user.id}:`, error);
        errors++;
      }
    }

    console.log(`Notifications sent: ${notificationsSent}, Errors: ${errors}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsSent,
        errors 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Saturday Trivia notification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
