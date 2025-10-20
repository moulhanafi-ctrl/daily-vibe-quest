// Diagnostic endpoint to check if Google Maps API key is configured
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
  
  const diagnostics = {
    configured: !!apiKey,
    keyLength: apiKey?.length || 0,
    keyPreview: apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : "NOT SET",
    hasInvalidChars: apiKey ? /[^\x00-\x7F]/.test(apiKey) : false,
    timestamp: new Date().toISOString()
  };

  console.log("[check-google-key]", JSON.stringify(diagnostics));

  return new Response(JSON.stringify(diagnostics, null, 2), {
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});
