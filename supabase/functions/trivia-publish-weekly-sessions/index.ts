import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { verifyHmacSignature } from "../_shared/hmac-validation.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
};

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
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('[TRIVIA-SESSION-PUBLISH] Starting publication check');

    // Get today's date in Detroit timezone
    const detroitTime = new Date().toLocaleString('en-US', { timeZone: 'America/Detroit' });
    const today = new Date(detroitTime).toISOString().split('T')[0];

    // Find draft sessions scheduled for today
    const { data: sessions, error } = await supabase
      .from('trivia_weekly_sessions')
      .select('*')
      .eq('status', 'draft')
      .lte('scheduled_at_local', new Date().toISOString());

    if (error) throw error;

    if (!sessions || sessions.length === 0) {
      console.log('[TRIVIA-SESSION-PUBLISH] No draft sessions ready to publish');
      return new Response(
        JSON.stringify({ message: 'No sessions to publish', date: today }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`[TRIVIA-SESSION-PUBLISH] Found ${sessions.length} sessions to publish`);

    // Publish all ready sessions
    for (const session of sessions) {
      const { error: updateError } = await supabase
        .from('trivia_weekly_sessions')
        .update({ 
          status: 'published',
          published_at: new Date().toISOString()
        })
        .eq('id', session.id);

      if (updateError) {
        console.error(`[TRIVIA-SESSION-PUBLISH] Error publishing session ${session.id}:`, updateError);
      } else {
        console.log(`[TRIVIA-SESSION-PUBLISH] Published session ${session.id} for ${session.week_key}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        published: sessions.length,
        date: today,
        sessions: sessions.map(s => ({ week_key: s.week_key, topics: s.topics }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('[TRIVIA-SESSION-PUBLISH] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});