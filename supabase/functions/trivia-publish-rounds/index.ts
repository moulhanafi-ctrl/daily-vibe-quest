import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('[TRIVIA-PUBLISH] Starting publication check');

    // Get today's date (should be Saturday)
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Find all unpublished rounds for today
    const { data: rounds, error } = await supabase
      .from('trivia_rounds')
      .select('*')
      .eq('date', today)
      .eq('published', false);

    if (error) throw error;

    if (!rounds || rounds.length === 0) {
      console.log('[TRIVIA-PUBLISH] No unpublished rounds found for today');
      return new Response(JSON.stringify({ 
        message: 'No rounds to publish',
        date: today 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`[TRIVIA-PUBLISH] Found ${rounds.length} rounds to publish`);

    // Publish all rounds
    const { error: updateError } = await supabase
      .from('trivia_rounds')
      .update({ published: true })
      .eq('date', today)
      .eq('published', false);

    if (updateError) throw updateError;

    console.log(`[TRIVIA-PUBLISH] Published ${rounds.length} rounds for ${today}`);

    // Update generation logs
    for (const round of rounds) {
      await supabase
        .from('trivia_generation_log')
        .update({ status: 'success' })
        .eq('week', today)
        .eq('age_group', round.age_group)
        .eq('locale', round.locale)
        .eq('status', 'review');
    }

    return new Response(JSON.stringify({ 
      success: true,
      published: rounds.length,
      date: today,
      rounds: rounds.map(r => ({ age_group: r.age_group, locale: r.locale }))
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('[TRIVIA-PUBLISH] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});