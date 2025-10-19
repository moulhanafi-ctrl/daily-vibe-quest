// Test Google Maps API configuration
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const GOOGLE_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
  
  const results = {
    apiKeyConfigured: !!GOOGLE_API_KEY,
    apiKeyLength: GOOGLE_API_KEY?.length || 0,
    tests: {} as any,
  };

  if (!GOOGLE_API_KEY) {
    return new Response(JSON.stringify({
      ...results,
      error: "GOOGLE_MAPS_API_KEY not configured in secrets"
    }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  // Test 1: Geocoding API
  try {
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=90210&key=${GOOGLE_API_KEY}`;
    const geocodeRes = await fetch(geocodeUrl);
    const geocodeJson = await geocodeRes.json();
    
    results.tests.geocoding = {
      status: geocodeJson.status,
      success: geocodeJson.status === "OK",
      error: geocodeJson.error_message || null,
    };
  } catch (e) {
    results.tests.geocoding = {
      status: "ERROR",
      success: false,
      error: (e as Error).message,
    };
  }

  // Test 2: Places API
  try {
    const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=34.0522,-118.2437&radius=5000&keyword=therapist&key=${GOOGLE_API_KEY}`;
    const placesRes = await fetch(placesUrl);
    const placesJson = await placesRes.json();
    
    results.tests.places = {
      status: placesJson.status,
      success: placesJson.status === "OK",
      error: placesJson.error_message || null,
      resultsCount: placesJson.results?.length || 0,
    };
  } catch (e) {
    results.tests.places = {
      status: "ERROR",
      success: false,
      error: (e as Error).message,
    };
  }

  const allSuccess = results.tests.geocoding?.success && results.tests.places?.success;

  return new Response(JSON.stringify({
    ...results,
    overall: allSuccess ? "✅ All APIs working" : "❌ Some APIs failed",
    recommendation: allSuccess 
      ? "Your Google Maps setup is working correctly!"
      : "Check Google Cloud Console: Enable Geocoding API + Places API, ensure billing is active, and remove HTTP referrer restrictions",
  }), {
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});
