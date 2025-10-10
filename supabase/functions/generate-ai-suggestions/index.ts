import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, moods } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build context from recent moods
    const moodSummary = moods
      ?.map((m: any) => `${m.mood} (intensity: ${m.intensity})`)
      .join(", ") || "No recent mood data";

    // Call Lovable AI to generate suggestions
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a compassionate mental wellness advisor. Generate 3 personalized suggestions based on the user's recent mood patterns. Be supportive, actionable, and age-appropriate.",
          },
          {
            role: "user",
            content: `Recent moods: ${moodSummary}. Please provide 3 wellness suggestions.`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const suggestions = aiData.choices[0].message.content;

    // Parse suggestions and store them
    const suggestionLines = suggestions.split("\n").filter((line: string) => line.trim());
    
    for (const line of suggestionLines.slice(0, 3)) {
      const cleanLine = line.replace(/^\d+\.\s*/, "").trim();
      if (cleanLine) {
        await supabase.from("ai_suggestions").insert({
          user_id: userId,
          suggestion_type: "wellness_tip",
          content: cleanLine,
          is_read: false,
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating suggestions:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
