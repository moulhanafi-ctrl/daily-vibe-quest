// Production-ready "Find help near me" API for US & Canada
// POST /api/help/nearby - Returns therapists, crisis centers, and national hotlines

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ============= Configuration =============
const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY") ?? "";
const MAPBOX_TOKEN = Deno.env.get("MAPBOX_TOKEN") ?? "";
const TIMEOUT_MS = 4000;
const CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutes
const RATE_LIMIT_PER_MIN = 30;

// ============= Rate Limiting =============
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimits.get(ip);
  
  if (!limit || now > limit.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }
  
  if (limit.count >= RATE_LIMIT_PER_MIN) {
    return false;
  }
  
  limit.count++;
  return true;
}

// ============= Cache =============
const cache = new Map<string, { ts: number; data: any }>();

// ============= Validation =============
const US_ZIP = /^\d{5}(-\d{4})?$/;
const CA_POSTAL = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;

const RequestSchema = z.object({
  code: z.string().trim().min(1).max(10),
  countryHint: z.enum(["US", "CA"]).nullable().optional(),
  radiusKm: z.number().int().positive().max(100).default(40),
  limit: z.number().int().positive().max(50).default(30),
  filters: z.object({
    openNow: z.boolean().default(false),
    type: z.enum(["all", "therapists", "crisis"]).default("all"),
  }).default({}),
});

type HelpRequest = z.infer<typeof RequestSchema>;

function validateAndNormalize(code: string, hint?: string | null): { valid: boolean; normalized: string; country?: "US" | "CA"; error?: string } {
  const trimmed = code.trim();
  
  if (US_ZIP.test(trimmed)) {
    return { valid: true, normalized: trimmed, country: "US" };
  }
  
  if (CA_POSTAL.test(trimmed)) {
    const normalized = trimmed.toUpperCase().replace(/\s+/g, "");
    const formatted = `${normalized.slice(0, 3)} ${normalized.slice(3)}`;
    return { valid: true, normalized: formatted, country: "CA" };
  }
  
  return {
    valid: false,
    normalized: trimmed,
    error: "Invalid ZIP/postal code format (US: 12345, Canada: A1A 1A1)",
  };
}

// ============= National Hotlines =============
function getNationalHotlines(country: "US" | "CA") {
  const hotlines = country === "CA" ? [
    { name: "988 Suicide Crisis Helpline", phone: "988", website: "https://988.ca" },
    { name: "Talk Suicide Canada", phone: "1-833-456-4566", website: "https://talksuicide.ca" },
    { name: "Kids Help Phone", phone: "1-800-668-6868", website: "https://kidshelpphone.ca" },
    { name: "211 Canada", phone: "211", website: "https://211.ca" },
    { name: "Hope for Wellness Helpline", phone: "1-855-242-3310", website: "https://www.hopeforwellness.ca" },
  ] : [
    { name: "988 Suicide & Crisis Lifeline", phone: "988", website: "https://988lifeline.org" },
    { name: "Crisis Text Line", phone: "Text HOME to 741741", website: "https://www.crisistextline.org/" },
    { name: "211 Community Resources", phone: "211", website: "https://www.211.org" },
    { name: "The Trevor Project", phone: "1-866-488-7386", website: "https://www.thetrevorproject.org" },
    { name: "National Domestic Violence Hotline", phone: "1-800-799-7233", website: "https://www.thehotline.org" },
    { name: "Veterans Crisis Line", phone: "988", website: "https://www.veteranscrisisline.net" },
    { name: "SAMHSA National Helpline", phone: "1-800-662-4357", website: "https://www.samhsa.gov/find-help/national-helpline" },
  ];
  
  // Format as Provider objects for consistency
  return hotlines.map(h => ({
    name: h.name,
    phone: h.phone,
    website: h.website,
    distanceKm: 0,
    distanceMi: 0,
    address: null,
    rating: null,
    openNow: null,
    type: "crisis" as const,
  }));
}

// ============= Geocoding =============
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error("TIMEOUT")), ms)
  );
  return Promise.race([promise, timeout]);
}

async function geocodeMapbox(code: string, country: string): Promise<{ lat: number; lng: number; city?: string; region?: string } | null> {
  if (!MAPBOX_TOKEN) return null;
  
  try {
    const clean = encodeURIComponent(code);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${clean}.json?types=postcode&limit=1&country=${country}&access_token=${MAPBOX_TOKEN}`;
    const res = await withTimeout(fetch(url), TIMEOUT_MS);
    const json = await res.json();
    const feat = json.features?.[0];
    
    if (!feat) return null;
    
    const [lng, lat] = feat.center;
    const city = feat.context?.find((c: any) => c.id?.startsWith("place"))?.text;
    const region = feat.context?.find((c: any) => c.id?.startsWith("region"))?.short_code?.replace(/^[A-Z]+-/, "");
    
    return { lat, lng, city, region };
  } catch (e) {
    console.warn("[geocode-mapbox]", (e as Error).message);
    return null;
  }
}

async function geocodeGoogle(code: string): Promise<{ lat: number; lng: number; city?: string; region?: string; country: "US" | "CA" } | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.log("[geocode-google] No API key configured");
    return null;
  }
  
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(code)}&components=country:US|country:CA&key=${GOOGLE_MAPS_API_KEY}`;
    const res = await withTimeout(fetch(url), TIMEOUT_MS);
    const json = await res.json();
    
    if (json.status !== "OK" || !json.results?.length) {
      console.error("[geocode-google] FAILED", JSON.stringify({ 
        status: json.status, 
        error: json.error_message,
        code: code 
      }));
      return null;
    }
    
    const best = json.results[0];
    const lat = best.geometry.location.lat;
    const lng = best.geometry.location.lng;
    
    const getComponent = (type: string) => 
      best.address_components.find((c: any) => c.types?.includes(type));
    
    const city = getComponent("locality")?.long_name;
    const region = getComponent("administrative_area_level_1")?.short_name;
    const countryCode = getComponent("country")?.short_name as "US" | "CA";
    
    return { lat, lng, city, region, country: countryCode };
  } catch (e) {
    console.warn("[geocode-google]", (e as Error).message);
    return null;
  }
}

async function geocodeOSM(code: string): Promise<{ lat: number; lng: number; city?: string; region?: string; country: "US" | "CA" } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(code)}&limit=1&countrycodes=us,ca`;
    const res = await withTimeout(fetch(url, { headers: { "User-Agent": "HelpNearby/1.0" } }), TIMEOUT_MS);
    const json = await res.json();
    const first = json?.[0];
    
    if (!first) return null;
    
    const lat = parseFloat(first.lat);
    const lng = parseFloat(first.lon);
    const cc = String(first.address?.country_code ?? "us").toUpperCase() as "US" | "CA";
    const city = first.address?.city || first.address?.town;
    const region = first.address?.state;
    
    return { lat, lng, city, region, country: cc };
  } catch (e) {
    console.warn("[geocode-osm]", (e as Error).message);
    return null;
  }
}

async function geocode(code: string, country: string) {
  const startTime = Date.now();
  
  // Try Google first (best results)
  let result = await geocodeGoogle(code);
  let source = "google";
  
  // Fallback to Mapbox
  if (!result && MAPBOX_TOKEN) {
    const mapboxResult = await geocodeMapbox(code, country);
    if (mapboxResult) {
      result = { ...mapboxResult, country: country as "US" | "CA" };
      source = "mapbox";
    }
  }
  
  // Final fallback to OSM
  if (!result) {
    result = await geocodeOSM(code);
    source = "osm";
  }
  
  if (!result) {
    throw new Error("GEOCODE_FAILED");
  }
  
  const tookMs = Date.now() - startTime;
  console.log(`[geocode] source=${source} lat=${result.lat} lng=${result.lng} tookMs=${tookMs}`);
  
  return { ...result, source, geocodeTookMs: tookMs };
}

// ============= Places Search =============
interface Place {
  name: string;
  lat: number;
  lng: number;
  address?: string;
  phone?: string;
  website?: string;
  rating?: number;
  openNow?: boolean;
  type: "therapist" | "crisis";
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function searchGooglePlaces(
  center: { lat: number; lng: number },
  radiusM: number,
  keywords: string[],
  type: "therapist" | "crisis",
): Promise<Place[]> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.log("[google-places] No API key configured");
    return [];
  }
  
  const results: Place[] = [];
  
  for (const keyword of keywords) {
    try {
      const startTime = Date.now();
      
      // Use new Places API (New)
      const url = `https://places.googleapis.com/v1/places:searchText`;
      const requestBody = {
        textQuery: keyword,
        locationBias: {
          circle: {
            center: { latitude: center.lat, longitude: center.lng },
            radius: radiusM
          }
        },
        maxResultCount: 20
      };
      
      const res = await withTimeout(fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.rating,places.currentOpeningHours.openNow,places.nationalPhoneNumber,places.websiteUri'
        },
        body: JSON.stringify(requestBody)
      }), TIMEOUT_MS);
      
      const json = await res.json();
      const tookMs = Date.now() - startTime;
      
      if (!res.ok || !json.places) {
        console.error(JSON.stringify({
          source: "GooglePlacesNew",
          status: "ERROR",
          error_code: json.error?.code || res.status,
          reason: json.error?.message || "Unknown error",
          keyword,
          tookMs
        }));
        continue;
      }
      
      console.log(JSON.stringify({
        source: "GooglePlacesNew",
        status: "OK",
        keyword,
        results: json.places?.length || 0,
        tookMs
      }));
      
      if (json.places) {
        for (const place of json.places) {
          results.push({
            name: place.displayName?.text || "Unknown",
            lat: place.location?.latitude,
            lng: place.location?.longitude,
            address: place.formattedAddress || null,
            phone: place.nationalPhoneNumber || null,
            website: place.websiteUri || null,
            rating: place.rating || null,
            openNow: place.currentOpeningHours?.openNow ?? null,
            type,
          });
        }
      }
    } catch (e) {
      console.error(JSON.stringify({
        source: "GooglePlacesNew",
        status: "ERROR",
        error_code: "EXCEPTION",
        reason: (e as Error).message,
        keyword,
        tookMs: 0
      }));
    }
  }
  
  return results;
}

async function findProviders(
  center: { lat: number; lng: number },
  radiusKm: number,
  filters: HelpRequest["filters"],
) {
  const radiusM = radiusKm * 1000;
  const therapistKeywords = [
    "therapist",
    "psychologist",
    "counseling center",
    "behavioral health clinic",
    "mental health services",
    "social services",
    "psychiatrist",
    "therapy center",
    "wellness clinic"
  ];
  const crisisKeywords = [
    "suicide prevention",
    "mental health crisis",
    "emergency mental health",
    "rehabilitation center",
    "recovery program",
    "addiction treatment",
    "community health center",
    "crisis hotline",
    "support group"
  ];
  
  let allPlaces: Place[] = [];
  
  if (filters.type === "all" || filters.type === "therapists") {
    const therapists = await searchGooglePlaces(center, radiusM, therapistKeywords, "therapist");
    allPlaces.push(...therapists);
  }
  
  if (filters.type === "all" || filters.type === "crisis") {
    const crisis = await searchGooglePlaces(center, radiusM, crisisKeywords, "crisis");
    allPlaces.push(...crisis);
  }
  
  // Deduplicate by name+address
  const seen = new Map<string, Place>();
  for (const p of allPlaces) {
    const key = `${p.name.toLowerCase()}|${(p.address || "").toLowerCase()}`;
    if (!seen.has(key)) {
      seen.set(key, p);
    }
  }
  
  let uniquePlaces = Array.from(seen.values());
  
  // Filter by openNow if requested
  if (filters.openNow) {
    uniquePlaces = uniquePlaces.filter((p) => p.openNow === true);
  }
  
  // Sort by distance first, then rating
  uniquePlaces.sort((a, b) => {
    const da = haversineKm(center.lat, center.lng, a.lat, a.lng);
    const db = haversineKm(center.lat, center.lng, b.lat, b.lng);
    
    // If distances are significantly different (>5km), sort by distance
    if (Math.abs(da - db) > 5) return da - db;
    
    // Otherwise sort by rating
    const ratingA = a.rating || 0;
    const ratingB = b.rating || 0;
    if (Math.abs(ratingA - ratingB) > 0.1) return ratingB - ratingA;
    
    // If ratings are similar, prefer closer location
    return da - db;
  });
  
  return uniquePlaces;
}

// ============= Main Handler =============
serve(async (req) => {
  const startTime = Date.now();
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Rate limiting
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    if (!checkRateLimit(ip)) {
      return new Response(
        JSON.stringify({ error: "RATE_LIMIT_EXCEEDED", message: "Too many requests. Please try again in a minute." }),
        { status: 429, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }
    
    // Parse and validate request
    const body = await req.json();
    const validated = RequestSchema.parse(body);
    
    // Validate code format
    const validation = validateAndNormalize(validated.code, validated.countryHint);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: "INVALID_CODE", message: validation.error }),
        { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }
    
    const { normalized, country } = validation;
    
    // Check cache
    const cacheKey = `${normalized}|${validated.radiusKm}|${validated.filters.type}|${validated.filters.openNow}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      console.log(`[help-nearby] CACHE HIT ${cacheKey}`);
      return new Response(JSON.stringify({ ...cached.data, meta: { ...cached.data.meta, cache: "HIT" } }), {
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    
    // Geocode
    const geo = await geocode(normalized, country!);
    const center = { lat: geo.lat, lng: geo.lng };
    
    // Find providers
    const providers = await findProviders(center, validated.radiusKm, validated.filters);
    const limited = providers.slice(0, validated.limit);
    
    // Build response
    const locals = limited.map((p) => ({
      name: p.name,
      type: p.type,
      distanceKm: parseFloat(haversineKm(center.lat, center.lng, p.lat, p.lng).toFixed(1)),
      distanceMi: parseFloat((haversineKm(center.lat, center.lng, p.lat, p.lng) * 0.621371).toFixed(1)),
      phone: p.phone || null,
      website: p.website || null,
      address: p.address || null,
      rating: p.rating || null,
      openNow: p.openNow ?? null,
    }));
    
    const nationals = getNationalHotlines(geo.country);
    
    const tookMs = Date.now() - startTime;
    
    const response = {
      status: "ok",
      geocoder: geo.source,
      where: {
        lat: geo.lat,
        lng: geo.lng,
        city: geo.city || null,
        region: geo.region || null,
        country: geo.country,
      },
      localResults: locals,
      nationalResults: nationals,
      fallback: geo.source !== "google",
      error: null,
      meta: {
        radiusKm: validated.radiusKm,
        source: geo.source,
        tookMs,
        cache: "MISS",
      },
    };
    
    // Cache response
    cache.set(cacheKey, { ts: Date.now(), data: response });
    
    // Log (structured, no PII)
    console.log(JSON.stringify({
      code: normalized,
      country: geo.country,
      sourceUsed: geo.source,
      locals: locals.length,
      nationals: nationals.length,
      tookMs,
      cache: "MISS",
    }));
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (error) {
    const err = error as Error;
    console.error("[help-nearby] ERROR:", err.message);
    
    let status = 200;
    let userMessage = "Something went wrong. Please try again.";
    
    if (err.message === "GEOCODE_FAILED") {
      userMessage = "We couldn't locate that code. Please check and try again.";
    } else if (err.message === "TIMEOUT") {
      userMessage = "Request timed out. Please try again.";
    } else if (err instanceof z.ZodError) {
      status = 400;
      userMessage = err.errors[0].message;
    }
    
    // Always return nationals even on error
    const nationals = getNationalHotlines("US");
    
    return new Response(
      JSON.stringify({
        status: "error",
        geocoder: "unknown",
        error: err.message,
        message: userMessage,
        localResults: [],
        nationalResults: nationals,
        fallback: true,
        meta: { tookMs: Date.now() - startTime, cache: "MISS" },
      }),
      { status: 200, headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  }
});
