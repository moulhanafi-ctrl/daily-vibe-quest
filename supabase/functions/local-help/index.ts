// supabase/functions/local-help/index.ts
// Deno Edge Function for ZIP/Postal → therapists, crisis centers, and national hotlines (US + Canada)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// -------- Config --------
// Preferred provider: Google (Places + Geocoding). Fallback: Mapbox (Geocoding only) + simple OSM search.
// Set at least ONE of: GOOGLE_MAPS_API_KEY or MAPBOX_TOKEN in Project Settings → Functions → Environment Variables.
const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY") ?? "";
const MAPBOX_TOKEN = Deno.env.get("MAPBOX_TOKEN") ?? "";

// In-memory cache per function instance (best-effort). TTL: 24 hours.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const localCache = new Map<string, { ts: number; data: any }>();

// -------- Utilities --------
const US_ZIP = /^\d{5}(?:-\d{4})?$/;
const CA_POSTAL = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;

function normalizePostal(raw: string) {
  let s = (raw || "").trim();
  if (CA_POSTAL.test(s)) {
    s = s.toUpperCase().replace(/\s+/g, "");
    // Re-insert space for display A1A 1A1
    s = s.slice(0, 3) + " " + s.slice(3);
  }
  return s;
}

function milesToMeters(m: number) {
  return Math.round(m * 1609.344);
}

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 3958.7613; // miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function directionsURL(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

// Country-aware hotlines
function hotlines(countryCode: "US" | "CA") {
  if (countryCode === "CA") {
    return [
      { label: "988 Suicide Crisis Helpline (Canada)", call: "988", text: "988", url: "https://988.ca" },
      {
        label: "Kids Help Phone",
        call: "+1-800-668-6868",
        text: "Text CONNECT to 686868",
        url: "https://kidshelpphone.ca",
      },
      { label: "Emergency", call: "911" },
    ];
  }
  return [
    { label: "988 Suicide & Crisis Lifeline (USA)", call: "988", text: "988", url: "https://988lifeline.org" },
    { label: "Crisis Text Line", text: "Text HOME to 741741", url: "https://www.crisistextline.org/" },
    { label: "Emergency", call: "911" },
  ];
}

// -------- Geocoding --------
async function geocode(query: string): Promise<{ lat: number; lng: number; countryCode: "US" | "CA" }> {
  // Prefer Google if available
  if (GOOGLE_MAPS_API_KEY) {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", query);
    url.searchParams.set("key", GOOGLE_MAPS_API_KEY);
    url.searchParams.set("components", "country:US|country:CA");
    const res = await fetch(url);
    const json = await res.json();

    // Surface Google's own status instead of silently returning []
    if (json.status !== "OK" || !json.results?.length) {
      throw new Error(`GEOCODE_${json.status || "UNKNOWN"}:${json.error_message || "No results"}`);
    }

    const best = json.results[0];
    const lat = best.geometry.location.lat;
    const lng = best.geometry.location.lng;
    const countryComp = best.address_components.find((c: any) => c.types?.includes("country"));
    const cc = (countryComp?.short_name ?? "US") as "US" | "CA";
    if (cc !== "US" && cc !== "CA") throw new Error("UNSUPPORTED_COUNTRY");
    return { lat, lng, countryCode: cc };
  }

  // Fallback: Mapbox
  if (MAPBOX_TOKEN) {
    const clean = query.replace(/\s+/g, "%20");
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${clean}.json?types=postcode&limit=1&country=US,CA&access_token=${MAPBOX_TOKEN}`;
    const res = await fetch(url);
    const json = await res.json();
    const feat = json.features?.[0];
    if (!feat) throw new Error("GEOCODE_NOT_FOUND");
    const [lng, lat] = feat.center;
    const cc = (feat.context?.find((c: any) => c.id?.startsWith("country"))?.short_code ?? "us").toUpperCase();
    const countryCode = (cc === "CA" ? "CA" : "US") as "US" | "CA";
    return { lat, lng, countryCode };
  }

  throw new Error("NO_GEOCODER_CONFIGURED");
}

// -------- Places Search (Google preferred) --------
type Place = {
  name: string;
  lat: number;
  lng: number;
  address?: string;
  phone?: string;
  website?: string;
  rating?: number;
};

// Merge & dedupe by name+address
function mergePlaces(arrays: Place[][], center: { lat: number; lng: number }) {
  const map = new Map<string, Place>();
  const keyOf = (p: Place) => `${(p.name || "").toLowerCase()}|${(p.address || "").toLowerCase()}`;
  for (const a of arrays) {
    for (const p of a) {
      const k = keyOf(p);
      if (!map.has(k)) map.set(k, p);
    }
  }
  // Sort by distance, then rating desc
  const all = [...map.values()];
  all.sort((a, b) => {
    const da = haversineMiles(center.lat, center.lng, a.lat, a.lng);
    const db = haversineMiles(center.lat, center.lng, b.lat, b.lng);
    if (da !== db) return da - db;
    return (b.rating ?? 0) - (a.rating ?? 0);
  });
  return all;
}

async function googleNearby(
  center: { lat: number; lng: number },
  radiusMeters: number,
  keyword: string,
): Promise<Place[]> {
  const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
  url.searchParams.set("location", `${center.lat},${center.lng}`);
  url.searchParams.set("radius", String(radiusMeters));
  url.searchParams.set("keyword", keyword);
  // We avoid strict type to broaden results
  url.searchParams.set("key", GOOGLE_MAPS_API_KEY);
  const res = await fetch(url);
  const json = await res.json();
  const results: Place[] = (json.results ?? []).map((r: any) => ({
    name: r.name,
    lat: r.geometry?.location?.lat,
    lng: r.geometry?.location?.lng,
    address: r.vicinity,
    rating: r.rating,
    // Phone/website require a details lookup; we'll leave them undefined unless you add a Place Details call.
  }));
  return results;
}

// Lightweight fallback using OpenStreetMap Nominatim for category keywords (best-effort)
async function osmSearch(center: { lat: number; lng: number }, radiusMeters: number, q: string): Promise<Place[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("q", q);
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "20");
  url.searchParams.set("viewbox", `${center.lng - 1},${center.lat + 1},${center.lng + 1},${center.lat - 1}`);
  url.searchParams.set("bounded", "1");
  const res = await fetch(url, { headers: { "User-Agent": "VibeCheck/1.0" } });
  const json = await res.json();
  const withinRadius = (json ?? [])
    .map((r: any) => ({
      name: r.display_name?.split(",")?.[0],
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      address: r.display_name,
    }))
    .filter((p: Place) => haversineMiles(center.lat, center.lng, p.lat, p.lng) <= radiusMeters / 1609.344);
  return withinRadius;
}

async function findTherapists(center: { lat: number; lng: number }, radiusMeters: number): Promise<Place[]> {
  const therapistKeywords = ["therapist", "counselor", "psychologist", "psychiatrist", "mental health clinic"];
  if (GOOGLE_MAPS_API_KEY) {
    const arrays = await Promise.all(therapistKeywords.map((k) => googleNearby(center, radiusMeters, k)));
    return mergePlaces(arrays, center);
  }
  // Fallback best-effort
  const arrays = await Promise.all(therapistKeywords.map((k) => osmSearch(center, radiusMeters, k)));
  return mergePlaces(arrays, center);
}

async function findCrisisCenters(center: { lat: number; lng: number }, radiusMeters: number): Promise<Place[]> {
  const crisisKeywords = [
    "crisis center",
    "suicide prevention",
    "behavioral health urgent care",
    "mental health crisis",
    "hospital emergency",
  ];
  if (GOOGLE_MAPS_API_KEY) {
    const arrays = await Promise.all(crisisKeywords.map((k) => googleNearby(center, radiusMeters, k)));
    return mergePlaces(arrays, center);
  }
  // Fallback best-effort
  const arrays = await Promise.all(crisisKeywords.map((k) => osmSearch(center, radiusMeters, k)));
  return mergePlaces(arrays, center);
}

// -------- HTTP Handler --------
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ ok: false, error: "METHOD_NOT_ALLOWED" }), {
        status: 405,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    let zip_code = String(body?.zip_code ?? "").trim();
    let radius = Number(body?.radius ?? 20);

    if (!zip_code) throw new Error("ZIP_REQUIRED");
    if (!US_ZIP.test(zip_code) && !CA_POSTAL.test(zip_code)) {
      throw new Error("INVALID_ZIP_OR_POSTAL");
    }
    if (![15, 20, 25].includes(radius)) radius = 20;

    const normalized = normalizePostal(zip_code);
    const cacheKey = `${normalized}|${radius}`;
    const hit = localCache.get(cacheKey);
    const now = Date.now();
    if (hit && now - hit.ts < CACHE_TTL_MS) {
      return new Response(JSON.stringify(hit.data), {
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    // Geocode
    const geo = await geocode(normalized);
    const center = { lat: geo.lat, lng: geo.lng };
    const radiusMeters = milesToMeters(radius);

    // Places
    const therapists = (await findTherapists(center, radiusMeters)).slice(0, 3);
    const crisis = (await findCrisisCenters(center, radiusMeters)).slice(0, 3);

    const toResult = (p: Place) => ({
      name: p.name,
      address: p.address ?? null,
      phone: p.phone ?? null,
      website: p.website ?? null,
      distance_miles: Number(haversineMiles(center.lat, center.lng, p.lat, p.lng).toFixed(1)),
      directions_url: directionsURL(p.lat, p.lng),
    });

    const resp = {
      ok: true,
      countryCode: geo.countryCode,
      query: { zip: normalized, radius_miles: radius },
      center,
      therapists: therapists.map(toResult),
      crisis_centers: crisis.map(toResult),
      hotlines: hotlines(geo.countryCode),
    };

    localCache.set(cacheKey, { ts: now, data: resp });

    return new Response(JSON.stringify(resp), { headers: { ...corsHeaders, "content-type": "application/json" } });
  } catch (err) {
    const msg = (err as Error)?.message ?? "UNKNOWN";
    let userMessage = "Something went wrong.";
    if (msg === "ZIP_REQUIRED") userMessage = "Please enter a ZIP/postal code.";
    if (msg === "INVALID_ZIP_OR_POSTAL") userMessage = "Please check the format (e.g., 02115 or M5V 2T6).";
    if (msg === "GEOCODE_NOT_FOUND") userMessage = "We couldn't locate that code. Try another or check spelling.";
    if (msg === "NO_GEOCODER_CONFIGURED")
      userMessage = "Geocoder is not configured. Add GOOGLE_MAPS_API_KEY or MAPBOX_TOKEN.";
    if (msg === "UNSUPPORTED_COUNTRY") userMessage = "Only US and Canada are supported.";

    return new Response(JSON.stringify({ ok: false, error: msg, message: userMessage }), {
      status: 200,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
