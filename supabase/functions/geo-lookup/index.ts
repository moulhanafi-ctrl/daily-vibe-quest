import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory cache (1 hour TTL)
const cache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Rate limiting (IP-based, 30 requests per minute)
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW = 60 * 1000; // 1 minute

interface GeoLookupRequest {
  code: string;
  countryHint?: "US" | "CA" | null;
}

interface GeoResult {
  lat: number;
  lng: number;
  city?: string;
  region?: string;
  country?: string;
}

interface ProviderResult {
  name: string;
  description?: string;
  website: string;
  phone: string;
  distanceKm: number;
  distanceMi: number;
  type?: string;
}

const US_ZIP_REGEX = /^\d{5}(-\d{4})?$/;
const CA_POSTAL_REGEX = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/i;

const NATIONAL_RESOURCES = {
  US: [
    {
      name: "988 Suicide & Crisis Lifeline",
      description: "24/7 free and confidential support for people in distress",
      website: "https://988lifeline.org",
      phone: "988",
      distanceKm: 0,
      distanceMi: 0,
      type: "national"
    },
    {
      name: "Crisis Text Line",
      description: "Text HOME to 741741 for free 24/7 crisis support",
      website: "https://www.crisistextline.org",
      phone: "741741",
      distanceKm: 0,
      distanceMi: 0,
      type: "national"
    }
  ],
  CA: [
    {
      name: "Talk Suicide Canada",
      description: "24/7 support for anyone experiencing suicidal thoughts",
      website: "https://talksuicide.ca",
      phone: "1-833-456-4566",
      distanceKm: 0,
      distanceMi: 0,
      type: "national"
    },
    {
      name: "Kids Help Phone",
      description: "24/7 support for young people (call, text, live chat)",
      website: "https://kidshelpphone.ca",
      phone: "1-800-668-6868",
      distanceKm: 0,
      distanceMi: 0,
      type: "national"
    }
  ]
};

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimits.get(ip);

  if (!limit || now > limit.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (limit.count >= RATE_LIMIT) {
    return false;
  }

  limit.count++;
  return true;
}

function validateCode(code: string, countryHint?: string | null): { valid: boolean; country?: "US" | "CA"; normalized: string } {
  const normalized = code.trim().toUpperCase().replace(/\s+/g, " ");

  if (US_ZIP_REGEX.test(normalized)) {
    return { valid: true, country: "US", normalized };
  }

  if (CA_POSTAL_REGEX.test(normalized)) {
    return { valid: true, country: "CA", normalized };
  }

  return { valid: false, normalized };
}

async function geocodeWithMapbox(code: string, country: string): Promise<GeoResult | null> {
  const apiKey = Deno.env.get("GEOCODER_API_KEY");
  if (!apiKey) {
    console.warn("[GEO-LOOKUP] Mapbox API key not configured");
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const query = country === "CA" ? `${code}, Canada` : code;
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${apiKey}&country=${country}&types=postcode`,
      { signal: controller.signal }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      const [lng, lat] = feature.center;
      
      return {
        lat,
        lng,
        city: feature.context?.find((c: any) => c.id.startsWith("place"))?.text,
        region: feature.context?.find((c: any) => c.id.startsWith("region"))?.text,
        country: country === "CA" ? "Canada" : "United States"
      };
    }

    return null;
  } catch (error: any) {
    console.error("[GEO-LOOKUP] Mapbox error:", error.message);
    return null;
  }
}

async function geocodeWithOSM(code: string, country: string): Promise<GeoResult | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const query = country === "CA" ? `${code}, Canada` : `${code}, USA`;
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(code)}&country=${country === "CA" ? "Canada" : "United States"}&format=json&limit=1`,
      { 
        signal: controller.signal,
        headers: { "User-Agent": "DailyVibeCheck/1.0" }
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`OSM API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data && data.length > 0) {
      const result = data[0];
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        city: result.address?.city || result.address?.town,
        region: result.address?.state,
        country: country === "CA" ? "Canada" : "United States"
      };
    }

    return null;
  } catch (error: any) {
    console.error("[GEO-LOOKUP] OSM error:", error.message);
    return null;
  }
}

async function geocodeWithRetry(code: string, country: string): Promise<{ geoResult: GeoResult | null; geocoder: string }> {
  // Try Mapbox first
  let geoResult = await geocodeWithMapbox(code, country);
  if (geoResult) {
    return { geoResult, geocoder: "mapbox" };
  }

  // Retry Mapbox once
  await new Promise(resolve => setTimeout(resolve, 500));
  geoResult = await geocodeWithMapbox(code, country);
  if (geoResult) {
    return { geoResult, geocoder: "mapbox" };
  }

  // Fallback to OSM
  console.log("[GEO-LOOKUP] Falling back to OSM");
  geoResult = await geocodeWithOSM(code, country);
  if (geoResult) {
    return { geoResult, geocoder: "osm" };
  }

  // Retry OSM once
  await new Promise(resolve => setTimeout(resolve, 500));
  geoResult = await geocodeWithOSM(code, country);
  return { geoResult, geocoder: geoResult ? "osm" : "none" };
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): { km: number; mi: number } {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const km = R * c;
  return { km, mi: km * 0.621371 };
}

async function findLocalProviders(geoResult: GeoResult, supabase: any): Promise<ProviderResult[]> {
  const { data: locations, error } = await supabase
    .from("help_locations")
    .select("*")
    .eq("is_active", true)
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  if (error) {
    console.error("[GEO-LOOKUP] Database error:", error);
    return [];
  }

  const providers: ProviderResult[] = [];

  for (const location of locations) {
    const distance = calculateDistance(
      geoResult.lat,
      geoResult.lng,
      location.latitude,
      location.longitude
    );

    // Within 25 miles (40 km)
    if (distance.mi <= 25) {
      providers.push({
        name: location.name,
        description: location.type || "Mental health support provider",
        website: location.website_url || "https://www.nationalhelpline.org",
        phone: location.phone || "Information not available",
        distanceKm: Math.round(distance.km * 10) / 10,
        distanceMi: Math.round(distance.mi * 10) / 10,
        type: "local"
      });
    }
  }

  // Sort by distance and limit to 10
  return providers
    .sort((a, b) => a.distanceMi - b.distanceMi)
    .slice(0, 10);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Health endpoint
  if (req.method === "GET" && new URL(req.url).pathname.endsWith("/health")) {
    const hasMapbox = !!Deno.env.get("GEOCODER_API_KEY");
    return new Response(
      JSON.stringify({
        ok: true,
        geocoder: hasMapbox ? "mapbox" : "osm",
        cacheStatus: `${cache.size} entries`,
        uptime: performance.now()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Rate limiting
  const clientIp = req.headers.get("x-forwarded-for") || "unknown";
  if (!checkRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Please try again in a minute." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body: GeoLookupRequest = await req.json();
    const { code, countryHint } = body;

    if (!code) {
      return new Response(
        JSON.stringify({ error: "Missing 'code' parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate format
    const validation = validateCode(code, countryHint);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: "Invalid postal/ZIP format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check cache
    const cacheKey = `${validation.country}:${validation.normalized}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
      console.log("[GEO-LOOKUP] Cache hit:", cacheKey);
      return new Response(
        JSON.stringify({ ...cached.data, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const startTime = Date.now();

    // Geocode with retry and fallback
    const { geoResult, geocoder } = await geocodeWithRetry(validation.normalized, validation.country!);

    if (!geoResult) {
      console.error("[GEO-LOOKUP] Geocoding failed for:", validation.normalized);
      
      // Return national resources only
      const nationals = NATIONAL_RESOURCES[validation.country!] || NATIONAL_RESOURCES.US;
      return new Response(
        JSON.stringify({
          error: "Could not locate postal code",
          locals: [],
          nationals,
          country: validation.country,
          geocoder: "none",
          latencyMs: Date.now() - startTime
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find local providers
    const locals = await findLocalProviders(geoResult, supabase);
    const nationals = NATIONAL_RESOURCES[validation.country!] || NATIONAL_RESOURCES.US;

    const latencyMs = Date.now() - startTime;

    const response = {
      locals,
      nationals,
      location: geoResult,
      country: validation.country,
      geocoder,
      latencyMs,
      localCount: locals.length,
      nationalCount: nationals.length
    };

    // Cache the result
    cache.set(cacheKey, { data: response, expiry: Date.now() + CACHE_TTL });

    console.log(`[GEO-LOOKUP] Success: ${validation.normalized} → ${locals.length} local, ${nationals.length} national (${geocoder}, ${latencyMs}ms)`);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[GEO-LOOKUP] Error:", error.message);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
