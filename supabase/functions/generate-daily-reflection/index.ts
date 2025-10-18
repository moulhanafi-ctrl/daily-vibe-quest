import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Get user's recent mood data
    const { data: moods } = await supabaseClient
      .from('moods')
      .select('mood, intensity, reflection, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(7);

    // Get recent journal entries to understand themes
    const { data: entries } = await supabaseClient
      .from('journal_entries')
      .select('title, tags, date')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(5);

    // Build context for AI
    const moodContext = moods?.length 
      ? `Recent moods: ${moods.map(m => `${m.mood} (intensity: ${m.intensity}/5)`).join(', ')}`
      : 'No recent mood data';

    const journalContext = entries?.length
      ? `Recent journal themes: ${entries.map(e => e.tags?.join(', ')).filter(Boolean).join('; ')}`
      : 'No recent journal entries';

    const prompt = `Generate a thoughtful, personalized daily journal reflection prompt for today. 

User context:
${moodContext}
${journalContext}

Create a prompt that:
1. Acknowledges their recent emotional patterns
2. Encourages self-reflection
3. Is warm and supportive (not clinical)
4. Is 2-3 sentences long
5. Opens with something like "Today, reflect on..." or "Take a moment to consider..."

Generate ONLY the prompt text, nothing else.`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a compassionate wellness assistant helping users with daily journaling.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error('Failed to generate reflection prompt');
    }

    const aiData = await aiResponse.json();
    const reflectionPrompt = aiData.choices[0].message.content.trim();

    console.log('[DAILY_REFLECTION] Generated prompt for user:', user.id);

    return new Response(
      JSON.stringify({ 
        prompt: reflectionPrompt,
        hasMoodData: moods && moods.length > 0,
        hasJournalData: entries && entries.length > 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[DAILY_REFLECTION] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
