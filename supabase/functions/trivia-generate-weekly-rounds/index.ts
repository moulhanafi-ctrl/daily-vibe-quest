import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeneratedQuestion {
  category: string;
  type: string;
  prompt: string;
  options: Array<{id: string; text: string; emoji?: string}>;
  correct_option_id: string;
  explanation: string;
  tags: string[];
  sensitive: boolean;
}

const AGE_PROMPTS = {
  child: "simple words (grade 4 reading level), playful emoji allowed, no sarcasm, encouraging tone",
  teen: "encouraging, peer-respectful tone (grade 7 reading level), avoid preachy language",
  adult: "practical, warm, non-clinical, gender-neutral (grade 8 reading level)",
  elder: "respectful, warm, practical, non-clinical (grade 8 reading level)"
};

const CATEGORIES = {
  feelings: { weight: 0.20, desc: "Identifying and expressing emotions" },
  coping: { weight: 0.20, desc: "Healthy coping strategies and stress management" },
  empathy: { weight: 0.20, desc: "Understanding others' perspectives and showing kindness" },
  communication: { weight: 0.20, desc: "Clear, respectful communication and 'I-statements'" },
  habits: { weight: 0.20, desc: "Healthy habits like sleep, screens, movement, gratitude" }
};

const LANGUAGES = {
  en: "English",
  es: "Spanish (Español)",
  fr: "French (Français)",
  ar: "Arabic (العربية)"
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('[TRIVIA-GEN] Starting weekly round generation');

    // Get next Saturday
    const now = new Date();
    const daysUntilSaturday = (6 - now.getDay() + 7) % 7 || 7;
    const nextSaturday = new Date(now);
    nextSaturday.setDate(now.getDate() + daysUntilSaturday);
    nextSaturday.setHours(0, 0, 0, 0);
    const saturdayStr = nextSaturday.toISOString().split('T')[0];

    console.log(`[TRIVIA-GEN] Generating for ${saturdayStr}`);

    const ageGroups = ['child', 'teen', 'adult', 'elder'];
    const locales = ['en', 'es', 'fr', 'ar'];
    
    for (const ageGroup of ageGroups) {
      for (const locale of locales) {
        try {
          await generateRoundForAgeAndLocale(supabase, lovableApiKey, ageGroup, locale, saturdayStr);
        } catch (error) {
          console.error(`[TRIVIA-GEN] Failed for ${ageGroup}/${locale}:`, error);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, saturday: saturdayStr }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('[TRIVIA-GEN] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

async function generateRoundForAgeAndLocale(
  supabase: any,
  lovableApiKey: string,
  ageGroup: string,
  locale: string,
  saturdayStr: string
) {
  console.log(`[TRIVIA-GEN] Generating ${ageGroup}/${locale}`);

  // Create generation log
  const { data: logEntry } = await supabase
    .from('trivia_generation_log')
    .insert({
      week: saturdayStr,
      age_group: ageGroup,
      locale,
      status: 'pending'
    })
    .select()
    .single();

  try {
    // Generate 18 candidate questions (3x more than needed)
    const systemPrompt = buildSystemPrompt(ageGroup, locale);
    const candidates = await generateCandidates(lovableApiKey, systemPrompt, 18);

    console.log(`[TRIVIA-GEN] Generated ${candidates.length} candidates for ${ageGroup}/${locale}`);

    // Quality filter
    const { kept, dropped } = await filterCandidates(supabase, candidates, ageGroup, saturdayStr);

    console.log(`[TRIVIA-GEN] Kept ${kept.length}, dropped ${dropped.length}`);

    if (kept.length < 5) {
      throw new Error(`Insufficient questions after filtering: ${kept.length}/5`);
    }

    // Select best 5-7
    const selected = selectBestQuestions(kept, 7);

    // Insert questions
    const insertedQuestions = [];
    for (const q of selected) {
      const { data } = await supabase
        .from('trivia_questions')
        .insert({
          locale,
          age_group: ageGroup,
          category: q.category,
          type: q.type,
          prompt: q.prompt,
          options: q.options,
          correct_option_id: q.correct_option_id,
          explanation: q.explanation,
          tags: q.tags,
          sensitive: q.sensitive,
          active: true
        })
        .select()
        .single();
      
      if (data) insertedQuestions.push(data.id);
    }

    // Create round
    await supabase
      .from('trivia_rounds')
      .insert({
        date: saturdayStr,
        age_group: ageGroup,
        locale,
        question_ids: insertedQuestions,
        published: false
      });

    // Update log
    await supabase
      .from('trivia_generation_log')
      .update({
        status: 'success',
        kept_ids: insertedQuestions,
        candidates: kept,
        dropped_reasons: dropped
      })
      .eq('id', logEntry.id);

    console.log(`[TRIVIA-GEN] Success for ${ageGroup}/${locale}`);

  } catch (error: any) {
    console.error(`[TRIVIA-GEN] Error for ${ageGroup}/${locale}:`, error);
    await supabase
      .from('trivia_generation_log')
      .update({
        status: 'failed',
        error: error.message
      })
      .eq('id', logEntry.id);
  }
}

function buildSystemPrompt(ageGroup: string, locale: string): string {
  const ageStyle = AGE_PROMPTS[ageGroup as keyof typeof AGE_PROMPTS];
  const language = LANGUAGES[locale as keyof typeof LANGUAGES];

  return `You are an expert educational content creator for mental health and emotional intelligence trivia.

Generate trivia questions in ${language} for ${ageGroup}s.

TONE & STYLE: ${ageStyle}

CATEGORIES TO COVER (mix evenly):
${Object.entries(CATEGORIES).map(([cat, info]) => `- ${cat}: ${info.desc}`).join('\n')}

SAFETY RULES:
- No clinical/medical advice or diagnosis
- No graphic content or crisis topics
- Inclusive, culturally neutral language
- Gender-neutral examples
- No religious content
- Age-appropriate complexity

QUESTION TYPES:
- mcq: Multiple choice (4 options)
- emoji: Pick the emoji that matches (4 emoji options)
- scenario: Best response to a situation (4 options)

REQUIREMENTS:
- Prompt ≤140 characters
- Each option ≤40 characters
- Clear, unambiguous correct answer
- Helpful explanation (2-3 sentences)

Generate EXACTLY 18 questions as a JSON array matching this schema:
{
  "category": "feelings|coping|empathy|communication|habits",
  "type": "mcq|emoji|scenario",
  "prompt": "Question text",
  "options": [{"id": "a", "text": "Option text", "emoji": "🙂"}],
  "correct_option_id": "a",
  "explanation": "Why this is correct",
  "tags": ["sleep", "anxiety"],
  "sensitive": false
}`;
}

async function generateCandidates(lovableApiKey: string, systemPrompt: string, count: number): Promise<GeneratedQuestion[]> {
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
        { role: 'user', content: `Generate ${count} diverse trivia questions. Return ONLY valid JSON array, no markdown.` }
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

async function filterCandidates(
  supabase: any,
  candidates: GeneratedQuestion[],
  ageGroup: string,
  saturdayStr: string
): Promise<{ kept: GeneratedQuestion[]; dropped: any[] }> {
  const kept: GeneratedQuestion[] = [];
  const dropped: any[] = [];

  // Get recent questions for deduplication (last 12 weeks)
  const twelveWeeksAgo = new Date(saturdayStr);
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

  const { data: recentQuestions } = await supabase
    .from('trivia_questions')
    .select('prompt')
    .eq('age_group', ageGroup)
    .gte('created_at', twelveWeeksAgo.toISOString());

  const recentPrompts = new Set(recentQuestions?.map((q: any) => normalizePrompt(q.prompt)) || []);
  const seenThisRound = new Set<string>();

  for (const candidate of candidates) {
    const reasons: string[] = [];

    // Check length
    if (candidate.prompt.length > 140) reasons.push('Prompt too long');
    if (candidate.options.some(o => o.text.length > 40)) reasons.push('Option too long');

    // Check structure
    if (!candidate.options || candidate.options.length !== 4) reasons.push('Must have exactly 4 options');
    if (!candidate.options.find(o => o.id === candidate.correct_option_id)) reasons.push('Invalid correct_option_id');

    // Check duplicates
    const normalized = normalizePrompt(candidate.prompt);
    if (recentPrompts.has(normalized) || seenThisRound.has(normalized)) {
      reasons.push('Duplicate prompt');
    }

    // Check safety keywords (basic check)
    const lowerPrompt = candidate.prompt.toLowerCase();
    const unsafeTerms = ['kill', 'die', 'suicide', 'harm', 'hurt', 'abuse'];
    if (unsafeTerms.some(term => lowerPrompt.includes(term))) {
      reasons.push('Unsafe content');
    }

    if (reasons.length > 0) {
      dropped.push({ question: candidate, reasons });
    } else {
      kept.push(candidate);
      seenThisRound.add(normalized);
    }
  }

  return { kept, dropped };
}

function normalizePrompt(prompt: string): string {
  return prompt.toLowerCase().replace(/[^\w\s]/g, '').trim();
}

function selectBestQuestions(questions: GeneratedQuestion[], count: number): GeneratedQuestion[] {
  // Score each question
  const scored = questions.map(q => ({
    question: q,
    score: scoreQuestion(q, questions)
  }));

  // Sort by score and category diversity
  scored.sort((a, b) => b.score - a.score);

  // Select top N ensuring category coverage
  const selected: GeneratedQuestion[] = [];
  const categoryCount: Record<string, number> = {};

  for (const item of scored) {
    if (selected.length >= count) break;

    const cat = item.question.category;
    const currentCount = categoryCount[cat] || 0;

    // Prefer questions that balance categories
    if (currentCount < 2 || selected.length >= count - 1) {
      selected.push(item.question);
      categoryCount[cat] = currentCount + 1;
    }
  }

  return selected.slice(0, count);
}

function scoreQuestion(q: GeneratedQuestion, allQuestions: GeneratedQuestion[]): number {
  let score = 0;

  // Clarity: shorter prompts are clearer
  score += 0.30 * (1 - Math.min(q.prompt.length / 140, 1));

  // Category coverage: balance across categories
  const categoryCount = allQuestions.filter(x => x.category === q.category).length;
  score += 0.25 * (1 - Math.min(categoryCount / allQuestions.length, 1));

  // Engagement: emoji use for appropriate types
  if (q.type === 'emoji' && q.options.some(o => o.emoji)) {
    score += 0.20;
  } else if (q.type === 'scenario') {
    score += 0.20;
  }

  // Language quality: has explanation
  if (q.explanation && q.explanation.length > 20) {
    score += 0.15;
  }

  // Novelty: use of tags
  score += 0.10 * Math.min(q.tags.length / 3, 1);

  return score;
}