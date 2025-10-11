import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PrefsSchema = z.object({
  arthur_enabled: z.boolean().optional(),
  windows: z.array(z.string()).optional(),
  channels: z.array(z.enum(["push", "email"])) .optional(),
  quiet_hours: z
    .object({ start: z.string(), end: z.string() })
    .optional(),
});

const DEFAULTS = {
  arthur_enabled: false,
  windows: ["09:00", "17:00"],
  channels: ["push"],
  quiet_hours: { start: "21:00", end: "07:00" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
  );

  const requestId = crypto.randomUUID();

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    const user = userData?.user;
    if (authError || !user) {
      console.error(`[NOTIF-PREFS][${requestId}] Auth failed`, authError);
      return new Response(
        JSON.stringify({ error: "unauthorized", request_id: requestId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const isGet = req.method === "GET";
    const body = req.method === "POST" || req.method === "PUT" ? await req.json().catch(() => ({})) : {};
    const op = body?.op as string | undefined;

    // Support POST { op: 'get' } because invoke() uses POST
    if (isGet || op === "get") {
      const { data, error } = await supabase
        .from("notification_prefs")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error(`[NOTIF-PREFS][${requestId}] Select error`, error);
        return new Response(JSON.stringify({ error: error.message, request_id: requestId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }

      if (!data) {
        const defaults = { user_id: user.id, ...DEFAULTS, updated_at: new Date().toISOString() };
        return new Response(JSON.stringify({ ...defaults, request_id: requestId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      return new Response(JSON.stringify({ ...data, request_id: requestId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Validate and upsert
    const parsed = PrefsSchema.safeParse(body);
    if (!parsed.success) {
      console.warn(`[NOTIF-PREFS][${requestId}] Validation failed`, parsed.error.flatten());
      return new Response(
        JSON.stringify({ error: "validation_error", details: parsed.error.flatten(), request_id: requestId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Load current to merge
    const { data: existing } = await supabase
      .from("notification_prefs")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const toSave = {
      ...DEFAULTS,
      ...(existing ?? {}),
      ...(parsed.data as Record<string, unknown>),
    } as typeof DEFAULTS;

    const { data: saved, error: upsertError } = await supabase
      .from("notification_prefs")
      .upsert({ user_id: user.id, ...toSave }, { onConflict: "user_id" })
      .select()
      .single();

    if (upsertError) {
      console.error(`[NOTIF-PREFS][${requestId}] Upsert error`, upsertError);
      return new Response(JSON.stringify({ error: upsertError.message, request_id: requestId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    console.log(`[NOTIF-PREFS][${requestId}] Upsert succeeded for ${user.id}`);
    return new Response(JSON.stringify({ ...saved, request_id: requestId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    console.error(`[NOTIF-PREFS][${requestId}] Unexpected error`, e);
    return new Response(JSON.stringify({ error: "server_error", request_id: requestId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
