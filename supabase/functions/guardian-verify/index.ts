import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const hashCode = async (code: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Timing-safe string comparison
const timingSafeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
};

interface VerifyRequest {
  guardianEmail: string;
  code: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { guardianEmail, code }: VerifyRequest = await req.json();

    if (!guardianEmail || !code) {
      throw new Error("Guardian email and code are required");
    }

    if (!/^\d{6}$/.test(code)) {
      throw new Error("Invalid code format");
    }

    console.log(`Verifying guardian code for child ${user.id}, guardian ${guardianEmail}`);

    // Get guardian link record
    const { data: guardianLink, error: fetchError } = await supabase
      .from("guardian_links")
      .select("*")
      .eq("child_id", user.id)
      .eq("guardian_email", guardianEmail)
      .single();

    if (fetchError || !guardianLink) {
      throw new Error("Verification request not found");
    }

    // Check if already verified
    if (guardianLink.status === "verified") {
      return new Response(JSON.stringify({ 
        success: true,
        message: "Guardian already verified",
        verified: true
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check if code expired
    if (new Date(guardianLink.code_expires_at) < new Date()) {
      await supabase
        .from("guardian_links")
        .update({ status: "expired" })
        .eq("id", guardianLink.id);
      
      throw new Error("Verification code has expired. Please request a new one.");
    }

    // Verify code using timing-safe comparison
    const codeHash = await hashCode(code);
    if (!timingSafeEqual(codeHash, guardianLink.code_hash)) {
      throw new Error("Invalid verification code");
    }

    // Mark as verified
    const { error: updateError } = await supabase
      .from("guardian_links")
      .update({
        status: "verified",
        verified_at: new Date().toISOString(),
      })
      .eq("id", guardianLink.id);

    if (updateError) {
      throw updateError;
    }

    // Update profile to link parent
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ 
        parent_id: guardianLink.id // Store guardian_link id as reference
      })
      .eq("id", user.id);

    if (profileError) {
      console.error("Failed to update profile parent_id:", profileError);
    }

    // Log analytics event
    await supabase.from("analytics_events").insert({
      user_id: user.id,
      event_type: "guardian_verified",
      event_metadata: { 
        guardian_email: guardianEmail,
        method: "email_code"
      },
    });

    // Log to audit table
    await supabase.from("ai_audit").insert({
      actor: "system",
      action: "guardian_verified",
      target: `child:${user.id}`,
      input_json: { guardian_email: guardianEmail },
      output_json: { verified: true },
      status: "approved",
    });

    console.log("Guardian verification successful");

    return new Response(JSON.stringify({ 
      success: true,
      message: "Guardian verified successfully",
      verified: true
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in guardian-verify:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        verified: false
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
