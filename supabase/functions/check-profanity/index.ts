import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();

    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Lovable AI to check for profanity and sanitize
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite", // Fast classification model
        messages: [
          {
            role: "system",
            content: "You are a content moderation assistant. Analyze text for profanity, hate speech, explicit content, threats, harassment, or other offensive language. If offensive content is found, return it sanitized by replacing offensive words with asterisks (e.g., 'f***'). If the content is clean, return it unchanged."
          },
          {
            role: "user",
            content: `Analyze this text and return the result:\n\n${text}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "moderate_content",
              description: "Check if text contains offensive content and return sanitized or original text",
              parameters: {
                type: "object",
                properties: {
                  is_offensive: {
                    type: "boolean",
                    description: "Whether the text contains offensive content"
                  },
                  sanitized_text: {
                    type: "string",
                    description: "The sanitized text with offensive words replaced by asterisks, or original if clean"
                  },
                  severity: {
                    type: "string",
                    enum: ["none", "mild", "moderate", "severe"],
                    description: "Severity level of offensive content"
                  },
                  reason: {
                    type: "string",
                    description: "Brief explanation of why content was flagged (empty if clean)"
                  }
                },
                required: ["is_offensive", "sanitized_text", "severity", "reason"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "moderate_content" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Content moderation service unavailable" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log("AI moderation response:", JSON.stringify(data));

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in response");
      return new Response(
        JSON.stringify({ error: "Invalid moderation response" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);
    
    return new Response(
      JSON.stringify({
        is_offensive: result.is_offensive,
        sanitized_text: result.sanitized_text,
        severity: result.severity,
        reason: result.reason,
        original_length: text.length,
        sanitized_length: result.sanitized_text.length
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error("Error in check-profanity function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
