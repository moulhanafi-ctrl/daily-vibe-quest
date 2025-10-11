import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SubmitTriviaRequest {
  roundId: string;
  answers: Array<{
    questionId: string;
    selectedOptionId: string;
    correct: boolean;
  }>;
  score: number;
  correct: number;
  total: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { roundId, answers, score, correct, total }: SubmitTriviaRequest = await req.json();

    console.log(`Submitting trivia for user ${user.id}, round ${roundId}`);

    // Calculate streak
    const { data: previousProgress } = await supabaseClient
      .from('trivia_progress')
      .select('streak, played_at')
      .eq('user_id', user.id)
      .order('played_at', { ascending: false })
      .limit(1)
      .single();

    let streak = 1;
    if (previousProgress) {
      const lastPlayedDate = new Date(previousProgress.played_at);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - lastPlayedDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Streak continues if played within 7-14 days (allowing for weekly cadence)
      if (daysDiff >= 6 && daysDiff <= 14) {
        streak = previousProgress.streak + 1;
      }
    }

    // Insert progress
    const { error: insertError } = await supabaseClient
      .from('trivia_progress')
      .insert({
        user_id: user.id,
        round_id: roundId,
        score,
        correct,
        total,
        streak,
        answers: answers,
      });

    if (insertError) {
      console.error('Error inserting progress:', insertError);
      throw insertError;
    }

    // Update family score if user is in a family
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('parent_id')
      .eq('id', user.id)
      .single();

    if (profile?.parent_id) {
      // Find family group
      const { data: familyMember } = await supabaseClient
        .from('family_members')
        .select('family_id')
        .eq('user_id', user.id)
        .single();

      if (familyMember?.family_id) {
        // Check if family score exists
        const { data: existingScore } = await supabaseClient
          .from('family_scores')
          .select('total_score, participants')
          .eq('family_id', familyMember.family_id)
          .eq('round_id', roundId)
          .single();

        if (existingScore) {
          // Update existing
          await supabaseClient
            .from('family_scores')
            .update({
              total_score: existingScore.total_score + score,
              participants: existingScore.participants + 1,
            })
            .eq('family_id', familyMember.family_id)
            .eq('round_id', roundId);
        } else {
          // Create new
          await supabaseClient
            .from('family_scores')
            .insert({
              family_id: familyMember.family_id,
              round_id: roundId,
              total_score: score,
              participants: 1,
            });
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        streak,
        score 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Trivia submit error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});