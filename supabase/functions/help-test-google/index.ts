// Diagnostic endpoint to test Google Maps API configuration
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY") ?? "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    apiKey: {
      configured: !!GOOGLE_MAPS_API_KEY,
      length: GOOGLE_MAPS_API_KEY.length,
      preview: GOOGLE_MAPS_API_KEY ? `${GOOGLE_MAPS_API_KEY.slice(0, 8)}...` : "NOT SET",
    },
    tests: {
      geocoding: { status: "pending", latency: 0, error: null as any },
      places: { status: "pending", latency: 0, error: null as any },
    },
  };

  // Test Geocoding API
  try {
    const geocodeStart = Date.now();
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=90210&key=${GOOGLE_MAPS_API_KEY}`;
    const geocodeRes = await fetch(geocodeUrl);
    const geocodeJson = await geocodeRes.json();
    diagnostics.tests.geocoding.latency = Date.now() - geocodeStart;
    
    if (geocodeJson.status === "OK") {
      diagnostics.tests.geocoding.status = "OK";
    } else {
      diagnostics.tests.geocoding.status = "ERROR";
      diagnostics.tests.geocoding.error = {
        code: geocodeJson.status,
        message: geocodeJson.error_message || "Unknown error",
      };
    }
  } catch (e) {
    diagnostics.tests.geocoding.status = "ERROR";
    diagnostics.tests.geocoding.error = {
      code: "EXCEPTION",
      message: (e as Error).message,
    };
  }

  // Test Places API
  try {
    const placesStart = Date.now();
    const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=34.0522,-118.2437&radius=5000&keyword=therapist&key=${GOOGLE_MAPS_API_KEY}`;
    const placesRes = await fetch(placesUrl);
    const placesJson = await placesRes.json();
    diagnostics.tests.places.latency = Date.now() - placesStart;
    
    if (placesJson.status === "OK") {
      diagnostics.tests.places.status = "OK";
      diagnostics.tests.places.resultsCount = placesJson.results?.length || 0;
    } else {
      diagnostics.tests.places.status = "ERROR";
      diagnostics.tests.places.error = {
        code: placesJson.status,
        message: placesJson.error_message || "Unknown error",
      };
    }
  } catch (e) {
    diagnostics.tests.places.status = "ERROR";
    diagnostics.tests.places.error = {
      code: "EXCEPTION",
      message: (e as Error).message,
    };
  }

  // Determine overall status
  const allTestsPass = 
    diagnostics.tests.geocoding.status === "OK" && 
    diagnostics.tests.places.status === "OK";
  
  diagnostics.overallStatus = allTestsPass ? "HEALTHY" : "UNHEALTHY";
  
  // Add recommendations
  if (!GOOGLE_MAPS_API_KEY) {
    diagnostics.recommendation = "Configure GOOGLE_MAPS_API_KEY in Edge Function Secrets";
  } else if (!allTestsPass) {
    const errors = [];
    if (diagnostics.tests.geocoding.error?.code === "REQUEST_DENIED") {
      errors.push("Geocoding API: Enable in Google Cloud Console and check API restrictions");
    }
    if (diagnostics.tests.places.error?.code === "REQUEST_DENIED") {
      errors.push("Places API: Enable in Google Cloud Console and check API restrictions");
    }
    if (diagnostics.tests.geocoding.error?.code === "OVER_QUERY_LIMIT") {
      errors.push("Geocoding API: Quota exceeded - check billing");
    }
    if (diagnostics.tests.places.error?.code === "OVER_QUERY_LIMIT") {
      errors.push("Places API: Quota exceeded - check billing");
    }
    diagnostics.recommendation = errors.length > 0 ? errors.join("; ") : "Check API key validity and restrictions in Google Cloud Console";
  } else {
    diagnostics.recommendation = "All systems operational";
  }

  return new Response(JSON.stringify(diagnostics, null, 2), {
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});
