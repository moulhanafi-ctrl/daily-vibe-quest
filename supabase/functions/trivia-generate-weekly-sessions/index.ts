import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { verifyHmacSignature } from "../_shared/hmac-validation.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
};

const TOPICS = ['general knowledge', 'science', 'history', 'arts', 'pop culture', 'geography', 'wellness', 'psychology'];

const MENTAL_HEALTH_TIPS = [
  { title: 'Box Breathing', content: 'Breathe in for 4 counts, hold for 4, exhale for 4, hold for 4. Repeat 3 times to calm your nervous system.', duration: 30 },
  { title: '5-4-3-2-1 Grounding', content: 'Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste. This brings you to the present moment.', duration: 35 },
  { title: 'Hydration & Mood', content: 'Drink a glass of water. Even mild dehydration can affect mood and energy. Your brain is 75% water!', duration: 30 },
  { title: 'Sleep Hygiene', content: 'Good sleep = good mood. Try going to bed at the same time each night and avoid screens 1 hour before bed.', duration: 40 },
  { title: 'Micro-Stretching', content: 'Stand up, reach toward the ceiling, roll your shoulders back. Just 30 seconds of movement boosts blood flow and mood.', duration: 30 },
  { title: 'Gratitude Moment', content: 'Think of 3 things you\'re grateful for right now. Gratitude rewires your brain for positivity.', duration: 35 },
  { title: 'Progressive Relaxation', content: 'Tense your shoulders for 5 seconds, then release. Notice the difference. Repeat with your jaw and hands.', duration: 40 },
  { title: 'Positive Self-Talk', content: 'Replace "I can\'t" with "I\'m learning to." Small word changes create big mindset shifts.', duration: 35 },
];

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
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('[TRIVIA-SESSION-GEN] Starting weekly session generation');

    // Calculate next Saturday 7:00 PM Detroit time
    const detroitTime = new Date().toLocaleString('en-US', { timeZone: 'America/Detroit' });
    const now = new Date(detroitTime);
    const daysUntilSaturday = (6 - now.getDay() + 7) % 7 || 7;
    const nextSaturday = new Date(now);
    nextSaturday.setDate(now.getDate() + daysUntilSaturday);
    nextSaturday.setHours(19, 0, 0, 0);
    
    const weekKey = nextSaturday.toISOString().split('T')[0];
    console.log(`[TRIVIA-SESSION-GEN] Generating for ${weekKey} at ${nextSaturday.toISOString()}`);

    // Check if already exists
    const { data: existing } = await supabase
      .from('trivia_weekly_sessions')
      .select('id')
      .eq('week_key', weekKey)
      .single();

    if (existing) {
      console.log('[TRIVIA-SESSION-GEN] Session already exists for this week');
      return new Response(
        JSON.stringify({ success: true, message: 'Session already exists', week_key: weekKey }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Select 3 random topics for variety
    const selectedTopics = TOPICS.sort(() => Math.random() - 0.5).slice(0, 3);
    console.log('[TRIVIA-SESSION-GEN] Selected topics:', selectedTopics);

    // Generate 30 questions (10 per session)
    const questions = await generateTriviaQuestions(lovableApiKey, selectedTopics);
    
    if (questions.length < 30) {
      throw new Error(`Insufficient questions generated: ${questions.length}/30`);
    }

    // Split into 3 sessions of 10 questions each
    const session1Questions = questions.slice(0, 10);
    const session2Questions = questions.slice(10, 20);
    const session3Questions = questions.slice(20, 30);

    // Select 2 random mental health tips
    const selectedTips = MENTAL_HEALTH_TIPS.sort(() => Math.random() - 0.5).slice(0, 2);

    // Create the weekly session
    const { data: session, error: sessionError } = await supabase
      .from('trivia_weekly_sessions')
      .insert({
        week_key: weekKey,
        scheduled_at_local: nextSaturday.toISOString(),
        topics: selectedTopics,
        status: 'draft',
        session_1_questions: session1Questions,
        session_2_questions: session2Questions,
        session_3_questions: session3Questions,
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    // Create mental health break videos (text-based for now)
    for (let i = 0; i < 2; i++) {
      const tip = selectedTips[i];
      const videoUrl = await generateBreakVideo(tip, weekKey);
      
      await supabase
        .from('trivia_break_videos')
        .insert({
          week_key: weekKey,
          break_position: i + 1,
          title: tip.title,
          tip_content: tip.content,
          duration_seconds: tip.duration,
          video_url: videoUrl,
          thumbnail_url: null,
          captions_url: null,
        });
    }

    console.log('[TRIVIA-SESSION-GEN] Successfully created session and break videos');

    return new Response(
      JSON.stringify({ 
        success: true, 
        week_key: weekKey,
        topics: selectedTopics,
        question_count: questions.length,
        session_id: session.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('[TRIVIA-SESSION-GEN] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function generateTriviaQuestions(lovableApiKey: string, topics: string[]): Promise<any[]> {
  const systemPrompt = `You are an expert trivia question generator. Create 30 diverse, engaging trivia questions across these topics: ${topics.join(', ')}.

REQUIREMENTS:
- Generate EXACTLY 30 questions (10 easy, 10 medium, 10 hard)
- Mix difficulty levels across all topics
- Questions should be safe-for-work, inclusive, and culturally sensitive
- NO medical advice, graphic content, or sensitive topics
- Questions should be interesting and educational
- Include variety: multiple choice, true/false, short answer

FORMAT each question as JSON:
{
  "q": "Question text (clear and concise)",
  "type": "multiple_choice|true_false|short_answer",
  "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
  "correct": "Correct answer or index",
  "difficulty": "easy|medium|hard",
  "category": "topic name",
  "explanation": "Brief explanation of the answer"
}

Return a JSON array of exactly 30 questions. NO markdown, just pure JSON.`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate 30 diverse trivia questions. Return ONLY valid JSON array.' }
      ],
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content.trim();
  
  // Remove markdown code blocks if present
  const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  return JSON.parse(jsonStr);
}

async function generateBreakVideo(tip: any, weekKey: string): Promise<string> {
  // For now, return a placeholder URL
  // In production, this would generate or fetch an actual video
  const videoId = `break-${weekKey}-${tip.title.toLowerCase().replace(/\s+/g, '-')}`;
  return `https://placeholder-videos.example.com/${videoId}.mp4`;
}