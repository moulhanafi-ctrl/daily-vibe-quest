import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mood, recentEntries = [] } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating mindful journal prompts for mood:", mood);

    // Create context from recent entries if provided
    let context = "";
    if (recentEntries.length > 0) {
      context = `\n\nRecent journal themes: ${recentEntries.slice(0, 3).join(", ")}`;
    }

    const systemPrompt = `You are a compassionate and mindful AI assistant helping teens and young adults with reflective journaling. 

Your role is to:
- Provide thoughtful, open-ended journal prompts
- Be warm, encouraging, and non-judgmental
- Use age-appropriate language (8th-grade reading level)
- Focus on self-discovery, emotional awareness, and growth
- Never give medical advice or act as a therapist
- Keep prompts positive and constructive, even for difficult emotions

Generate 3-5 thoughtful journal prompts based on the user's current mood. Each prompt should:
- Be specific and actionable
- Encourage deep reflection
- Be appropriate for teens/young adults
- Help process emotions in a healthy way`;

    const userPrompt = `Current mood: ${mood || "neutral"}${context}

Generate 3-5 mindful journal prompts that would help someone process this mood and reflect on their day. Make the prompts warm, engaging, and thought-provoking.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_prompts",
              description: "Generate thoughtful journal prompts for reflection",
              parameters: {
                type: "object",
                properties: {
                  prompts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        prompt: { type: "string" },
                        focus_area: { 
                          type: "string",
                          enum: ["gratitude", "self_reflection", "emotions", "growth", "relationships", "goals"]
                        },
                      },
                      required: ["prompt", "focus_area"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["prompts"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_prompts" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service unavailable. Please contact support." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response:", JSON.stringify(data, null, 2));

    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const prompts = JSON.parse(toolCall.function.arguments);
    console.log("Generated prompts:", prompts);

    return new Response(JSON.stringify(prompts), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in mindful-ai-assistant:", error);
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
