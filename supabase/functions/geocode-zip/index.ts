import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeocodeRequest {
  zipCode: string;
}

interface GeocodeResponse {
  lat: number;
  lon: number;
  zipCode: string;
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

async function geocodeWithMapbox(zipCode: string, apiKey: string): Promise<GeocodeResponse> {
  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(zipCode)}.json?access_token=${apiKey}&country=US&types=postcode`
  );
  
  if (!response.ok) {
    throw new Error(`Mapbox geocoding failed: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (!data.features || data.features.length === 0) {
    throw new Error('ZIP code not found');
  }
  
  const [lon, lat] = data.features[0].center;
  return { lat, lon, zipCode };
}

async function geocodeWithGoogle(zipCode: string, apiKey: string): Promise<GeocodeResponse> {
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(zipCode)}&components=country:US&key=${apiKey}`
  );
  
  if (!response.ok) {
    throw new Error(`Google geocoding failed: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (data.status !== 'OK' || !data.results || data.results.length === 0) {
    throw new Error('ZIP code not found');
  }
  
  const { lat, lng } = data.results[0].geometry.location;
  return { lat, lon: lng, zipCode };
}

async function geocodeWithOpenCage(zipCode: string, apiKey: string): Promise<GeocodeResponse> {
  const response = await fetch(
    `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(zipCode)}&countrycode=us&key=${apiKey}`
  );
  
  if (!response.ok) {
    throw new Error(`OpenCage geocoding failed: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (!data.results || data.results.length === 0) {
    throw new Error('ZIP code not found');
  }
  
  const { lat, lng } = data.results[0].geometry;
  return { lat, lon: lng, zipCode };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { zipCode }: GeocodeRequest = await req.json();

    if (!zipCode || !/^\d{5}$/.test(zipCode)) {
      return new Response(
        JSON.stringify({ error: 'Invalid ZIP code. Must be 5 digits.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Geocoding ZIP: ${zipCode} for user: ${user.id}`);

    const apiKey = Deno.env.get('GEOCODER_API_KEY');
    const provider = Deno.env.get('GEOCODER_PROVIDER') || 'mapbox';

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Geocoding service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let location: GeocodeResponse;
    
    switch (provider.toLowerCase()) {
      case 'google':
        location = await geocodeWithGoogle(zipCode, apiKey);
        break;
      case 'opencage':
        location = await geocodeWithOpenCage(zipCode, apiKey);
        break;
      case 'mapbox':
      default:
        location = await geocodeWithMapbox(zipCode, apiKey);
        break;
    }

    console.log(`Geocoded ${zipCode} to: ${location.lat}, ${location.lon}`);

    // Update user profile with new location and zipcode
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ 
        location: { lat: location.lat, lon: location.lon },
        zipcode: zipCode
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true, location }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Geocoding error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});