import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Sunday Trivia catch-up notification job started');

    // Get yesterday (Saturday)
    const saturday = new Date();
    saturday.setDate(saturday.getDate() - 1);
    const saturdayStr = saturday.toISOString().split('T')[0];

    // Get rounds for yesterday
    const { data: rounds } = await supabaseClient
      .from('trivia_rounds')
      .select('id, age_group')
      .eq('date', saturdayStr);

    if (!rounds || rounds.length === 0) {
      console.log('No rounds found for yesterday');
      return new Response(
        JSON.stringify({ message: 'No rounds found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const roundsByAge = rounds.reduce((acc, r) => {
      acc[r.age_group] = r.id;
      return acc;
    }, {} as Record<string, string>);

    // Get users who haven't played
    const { data: users } = await supabaseClient
      .from('profiles')
      .select(`
        id,
        username,
        age_group,
        language,
        trivia_preferences (
          enabled,
          notifications_enabled,
          sunday_reminder
        )
      `)
      .eq('trivia_preferences.enabled', true)
      .eq('trivia_preferences.notifications_enabled', true)
      .eq('trivia_preferences.sunday_reminder', true);

    let notificationsSent = 0;

    for (const user of users || []) {
      try {
        const roundId = roundsByAge[user.age_group];
        if (!roundId) continue;

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

        // Get user email
        const { data: authUser } = await supabaseClient.auth.admin.getUserById(user.id);
        if (!authUser?.user?.email) continue;

        // Localized messages
        const messages: Record<string, any> = {
          en: {
            subject: 'Last Chance: Saturday Trivia Ends Tonight! 🎯',
            body: `Hi ${user.username},\n\nJust a friendly reminder: Saturday Trivia ends tonight at 11:59pm!\n\nDon't miss out on this week's questions. It only takes 5 minutes.\n\nPlay now: https://your-app.com/trivia\n\n— The Vibe Check Team`,
          },
          es: {
            subject: 'Última oportunidad: ¡El Trivia del Sábado termina esta noche! 🎯',
            body: `Hola ${user.username},\n\nSolo un recordatorio amistoso: ¡El Trivia del Sábado termina esta noche a las 11:59pm!\n\nNo te pierdas las preguntas de esta semana. Solo toma 5 minutos.\n\nJuega ahora: https://your-app.com/trivia\n\n— El equipo de Vibe Check`,
          },
          fr: {
            subject: 'Dernière chance: Le Trivia du Samedi se termine ce soir! 🎯',
            body: `Bonjour ${user.username},\n\nJuste un rappel amical: Le Trivia du Samedi se termine ce soir à 23h59!\n\nNe manquez pas les questions de cette semaine. Cela ne prend que 5 minutes.\n\nJouez maintenant: https://your-app.com/trivia\n\n— L'équipe Vibe Check`,
          },
          ar: {
            subject: 'الفرصة الأخيرة: تنتهي مسابقة السبت الليلة! 🎯',
            body: `مرحبا ${user.username},\n\nمجرد تذكير ودي: تنتهي مسابقة السبت الليلة في الساعة 11:59 مساءً!\n\nلا تفوت أسئلة هذا الأسبوع. يستغرق 5 دقائق فقط.\n\nالعب الآن: https://your-app.com/trivia\n\n— فريق Vibe Check`,
          },
        };

        const locale = user.language || 'en';
        const message = messages[locale] || messages.en;

        await resend.emails.send({
          from: 'Vibe Check <notifications@vibecheck.app>',
          to: [authUser.user.email],
          subject: message.subject,
          text: message.body,
        });

        await supabaseClient.from('analytics_events').insert({
          user_id: user.id,
          event_type: 'notif_trivia_sent',
          event_metadata: { round_id: roundId, locale, type: 'sunday_catchup' },
          language: locale,
        });

        notificationsSent++;
        console.log(`Sunday catch-up sent to ${user.id}`);
      } catch (error) {
        console.error(`Error notifying user ${user.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsSent 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Sunday Trivia notification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
