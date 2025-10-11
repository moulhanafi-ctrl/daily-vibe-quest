import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiter
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const limit = rateLimits.get(key);
  
  if (!limit || now > limit.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  if (limit.count >= maxRequests) {
    return false;
  }
  
  limit.count++;
  return true;
}

const RequestSchema = z.object({
  zip_code: z.string().regex(/^\d{5}$/, "ZIP code must be 5 digits"),
  radius: z.number().min(5).max(100).optional().default(25),
});

interface ZippoResponse {
  country: string;
  "country abbreviation": string;
  places: Array<{
    "place name": string;
    longitude: string;
    latitude: string;
    state: string;
    "state abbreviation": string;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Get user (authenticated or anonymous)
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    let isAuthenticated = false;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && user) {
        userId = user.id;
        isAuthenticated = true;
      }
    }

    // Rate limiting: authenticated users get higher limits
    const rateLimitKey = userId || req.headers.get("x-forwarded-for") || "anon";
    const maxRequests = isAuthenticated ? 30 : 10;
    
    if (!checkRateLimit(rateLimitKey, maxRequests, 60000)) {
      return new Response(
        JSON.stringify({ ok: false, error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate input
    const body = RequestSchema.parse(await req.json());
    const { zip_code, radius } = body;

    // Geocode ZIP using Zippopotam API
    console.log(`Geocoding ZIP: ${zip_code}`);
    const zipResponse = await fetch(`https://api.zippopotam.us/us/${zip_code}`);
    
    if (!zipResponse.ok) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid ZIP code or ZIP not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const zipData: ZippoResponse = await zipResponse.json();
    const place = zipData.places[0];
    const city = place["place name"];
    const state = place["state abbreviation"];
    const userLat = parseFloat(place.latitude);
    const userLon = parseFloat(place.longitude);

    console.log(`Location: ${city}, ${state} (${userLat}, ${userLon})`);

    // Update user profile if authenticated
    if (userId && isAuthenticated) {
      await supabase
        .from("profiles")
        .update({ 
          zip_code,
          city,
          state,
          latitude: userLat,
          longitude: userLon,
        })
        .eq("id", userId);
    }

    // Haversine distance calculation
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 3959; // Earth's radius in miles
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    // Fetch nearby locations (crisis centers and therapists)
    const { data: locations, error: locError } = await supabase
      .from("help_locations")
      .select("*")
      .eq("is_active", true)
      .not("lat", "is", null)
      .not("lon", "is", null);

    if (locError) {
      console.error("Error fetching locations:", locError);
      return new Response(
        JSON.stringify({ ok: false, error: "Failed to fetch nearby resources" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate distances and filter by radius
    const locationsWithDistance = (locations || [])
      .map((loc: any) => {
        const distance = calculateDistance(userLat, userLon, loc.lat, loc.lon);
        return { ...loc, distance };
      })
      .filter((loc: any) => loc.distance <= radius)
      .sort((a: any, b: any) => a.distance - b.distance);

    // Separate by type
    const crisisCenters = locationsWithDistance
      .filter((loc: any) => loc.type === "crisis")
      .slice(0, 5)
      .map((loc: any) => ({
        id: loc.id,
        name: loc.name,
        phone: loc.phone,
        address: `${loc.address_line1 || ""}, ${loc.city || ""}, ${loc.state || ""}`.trim(),
        distance: Math.round(loc.distance * 10) / 10,
        open_now: loc.open_now,
        verified: !!loc.last_verified_at,
      }));

    const therapists = locationsWithDistance
      .filter((loc: any) => loc.type === "therapy")
      .slice(0, 10)
      .map((loc: any) => ({
        id: loc.id,
        name: loc.name,
        phone: loc.phone,
        website: loc.website_url,
        address: `${loc.address_line1 || ""}, ${loc.city || ""}, ${loc.state || ""}`.trim(),
        distance: Math.round(loc.distance * 10) / 10,
        accepts_insurance: loc.accepts_insurance,
        sliding_scale: loc.sliding_scale,
        telehealth: loc.telehealth,
        rating: loc.ratings?.average,
      }));

    console.log(`Found ${crisisCenters.length} crisis centers and ${therapists.length} therapists within ${radius} miles`);

    // Return results
    return new Response(
      JSON.stringify({
        ok: true,
        zip: zip_code,
        city,
        state,
        radius,
        crisis_centers: crisisCenters,
        therapists: therapists,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in local-help:", error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: "Invalid request format",
          details: error.errors.map(e => e.message).join(", ")
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generic error response (don't leak internals)
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: "An error occurred processing your request" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
