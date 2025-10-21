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
    const { type } = await req.json(); // "icon" or "banner"

    if (!type || !['icon', 'banner'].includes(type)) {
      return new Response(
        JSON.stringify({ error: "Type must be 'icon' or 'banner'" }),
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

    // Define prompts based on type
    const prompts = {
      icon: `Create a 1024x1024 square app icon for "Daily Vibe Check", a mental wellness app. The icon should feature:
- A cute, friendly emoji-style face with a gentle smile and rosy cheeks
- A vibrant gradient background from purple/lavender to coral/peach
- Modern, clean design suitable for iOS and Android app stores
- No text or transparency
- Centered composition with the face taking up most of the space
- Warm, welcoming, and approachable aesthetic
- Professional quality with smooth gradients and clean edges
Style: Modern, minimalist, Gen Z aesthetic with soft neon pastel colors`,

      banner: `Create a 1024x500 horizontal banner for "Daily Vibe Check" app on Google Play Store. Include:
- Left side: The cute emoji face logo with gradient (purple to coral) background
- Right side: App name "Daily Vibe Check" in modern, friendly font
- Tagline: "Your daily mental wellness companion"
- Background: Subtle gradient using lavender, teal, and coral colors
- Icons representing: journal, mood tracking, support community
- Clean, professional design with Gen Z aesthetic
- No transparency, vibrant but not overwhelming
- Modern UI design with proper spacing and balance
Style: Professional app store banner, warm and inviting, mental health focused`
    };

    console.log(`Generating ${type} graphic...`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: prompts[type as keyof typeof prompts]
          }
        ],
        modalities: ["image", "text"]
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
        JSON.stringify({ error: "Image generation service unavailable" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log("AI image generation response received");

    // Extract the generated image
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageUrl) {
      console.error("No image in response:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "No image generated" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        image: imageUrl,
        type: type,
        size: type === 'icon' ? '1024x1024' : '1024x500'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error("Error in generate-store-graphics function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
