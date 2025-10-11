import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ZipCodeRequest {
  zip_code?: string;
  zipCode?: string;
}

interface ZippopotamResponse {
  places: Array<{
    'place name': string;
    'state': string;
    'state abbreviation': string;
    'latitude': string;
    'longitude': string;
  }>;
}

// Haversine distance calculation
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[GEOCODE-ZIP][${requestId}] Request started`);

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.error(`[GEOCODE-ZIP][${requestId}] Auth failed:`, userError);
      return new Response(
        JSON.stringify({ ok: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: ZipCodeRequest = await req.json();
    const zipCode = (body.zip_code || body.zipCode)?.trim();

    if (!zipCode || !/^\d{5}$/.test(zipCode)) {
      console.warn(`[GEOCODE-ZIP][${requestId}] Invalid ZIP: ${zipCode}`);
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid ZIP code. Must be 5 digits.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[GEOCODE-ZIP][${requestId}] Validating ZIP: ${zipCode} for user: ${user.id}`);

    // Use free Zippopotam.us API to validate ZIP and get city/state/coordinates
    const zipResponse = await fetch(`https://api.zippopotam.us/us/${zipCode}`);
    
    if (!zipResponse.ok) {
      console.warn(`[GEOCODE-ZIP][${requestId}] Invalid ZIP from Zippopotam: ${zipCode}`);
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid ZIP code' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const zipData: ZippopotamResponse = await zipResponse.json();
    const place = zipData.places?.[0];
    
    if (!place) {
      console.warn(`[GEOCODE-ZIP][${requestId}] No place data for ZIP: ${zipCode}`);
      return new Response(
        JSON.stringify({ ok: false, error: 'ZIP code not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const city = place['place name'];
    const state = place['state abbreviation'];
    const lat = parseFloat(place['latitude']);
    const lon = parseFloat(place['longitude']);

    console.log(`[GEOCODE-ZIP][${requestId}] Resolved to: ${city}, ${state} (${lat}, ${lon})`);

    // Update user profile with full location data
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ 
        location: { zip: zipCode, lat, lon, city, state, consented: true },
        zipcode: zipCode
      })
      .eq('id', user.id);

    if (updateError) {
      console.error(`[GEOCODE-ZIP][${requestId}] Error updating profile:`, updateError);
      throw updateError;
    }

    console.log(`[GEOCODE-ZIP][${requestId}] Profile updated successfully`);

    // Query nearby local (non-national) help locations
    const { data: allLocations, error: locError } = await supabaseClient
      .from('help_locations')
      .select('*')
      .or('is_national.is.null,is_national.eq.false');

    if (locError) {
      console.error(`[GEOCODE-ZIP][${requestId}] Error fetching locations:`, locError);
    }

    // Calculate distances and filter by 50 miles radius
    const nearbyLocations = (allLocations || [])
      .map(loc => {
        if (!loc.lat || !loc.lon) return null;
        const distance = calculateDistance(lat, lon, loc.lat, loc.lon);
        if (distance > 50) return null;
        return { ...loc, distance };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.distance - b.distance);

    // Separate by type
    const therapists = nearbyLocations.filter((l: any) => l.type === 'therapy').slice(0, 3);
    const crisisCenters = nearbyLocations.filter((l: any) => l.type === 'crisis').slice(0, 3);

    console.log(`[GEOCODE-ZIP][${requestId}] Found ${therapists.length} therapists, ${crisisCenters.length} crisis centers`);

    // National fallback resources
    const national = {
      hotlines: [
        { name: '988 Suicide & Crisis Lifeline', phone: '988' },
        { name: 'SAMHSA Helpline', phone: '1-800-662-4357' },
        { name: 'NAMI HelpLine', phone: '1-800-950-6264' }
      ]
    };

    return new Response(
      JSON.stringify({ 
        ok: true, 
        zip: zipCode,
        city,
        state,
        lat,
        lon,
        location: { lat, lon },
        resources: {
          therapists,
          crisis_centers: crisisCenters,
          national
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`[GEOCODE-ZIP][${requestId}] Unexpected error:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ ok: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
