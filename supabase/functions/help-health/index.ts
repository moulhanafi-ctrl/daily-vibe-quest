// Health check endpoint for help services
// GET /api/help/health

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const startTime = Date.now();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
  const MAPBOX_TOKEN = Deno.env.get("MAPBOX_TOKEN");
  
  const geocoderStatus = GOOGLE_MAPS_API_KEY 
    ? "google" 
    : MAPBOX_TOKEN 
    ? "mapbox" 
    : "osm-only";
  
  const placesStatus = GOOGLE_MAPS_API_KEY ? "ok" : "disabled";
  
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  
  const health = {
    ok: true,
    geocoder: geocoderStatus,
    places: placesStatus,
    uptime,
    timestamp: new Date().toISOString(),
  };
  
  return new Response(JSON.stringify(health), {
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});
