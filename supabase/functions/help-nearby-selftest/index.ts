import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

async function runTest(code: string, country: "US" | "CA") {
  const start = Date.now();
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/help-nearby`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY || "",
      },
      body: JSON.stringify({ code, countryHint: country, radiusKm: 40, limit: 10 }),
    });

    const data = await res.json();
    const latencyMs = Date.now() - start;

    return {
      ok: res.ok,
      status: res.status,
      latencyMs,
      location: data?.location ?? null,
      geocoder: data?.geocoder ?? null,
      providers: Array.isArray(data?.providers) ? data.providers.length : 0,
      hotlines: Array.isArray(data?.nationalHotlines) ? data.nationalHotlines.length : 0,
      error: res.ok ? null : data,
    };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      latencyMs: Date.now() - start,
      location: null,
      geocoder: null,
      providers: 0,
      hotlines: 0,
      error: { message: (e as Error).message },
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Allow overriding via query params
    const url = new URL(req.url);
    const us = url.searchParams.get("us") || "48917"; // Lansing, MI
    const ca = url.searchParams.get("ca") || "M5H 2N2"; // Toronto, ON

    const usResult = await runTest(us, "US");
    const caResult = await runTest(ca, "CA");

    const body = {
      timestamp: new Date().toISOString(),
      tests: {
        us: { code: us, ...usResult },
        ca: { code: ca, ...caResult },
      },
      summary: {
        allOk: usResult.ok && caResult.ok,
      },
      runbook: "/src/docs/HELP_NEARBY_MONITORING.md",
    };

    return new Response(JSON.stringify(body, null, 2), {
      headers: { ...corsHeaders, "content-type": "application/json" },
      status: 200,
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { headers: { ...corsHeaders, "content-type": "application/json" }, status: 500 }
    );
  }
});