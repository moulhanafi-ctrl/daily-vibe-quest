import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RequestSchema = z.object({
  guardianEmail: z.string()
    .email("Invalid email format")
    .max(255, "Email too long")
    .trim()
    .toLowerCase(),
  code: z.string()
    .regex(/^\d{6}$/, "Code must be 6 digits")
    .length(6),
});

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

    // Validate input with zod
    const validatedInput = RequestSchema.parse(await req.json());
    const { guardianEmail, code } = validatedInput;

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

    // Look up the guardian's user account
    const { data: guardianUsers, error: guardianError } = await supabase.auth.admin.listUsers();
    
    if (guardianError) {
      console.error("Failed to list users:", guardianError);
      throw new Error("Unable to verify guardian account");
    }

    // Find guardian user by email
    const guardianUser = guardianUsers.users.find(
      u => u.email?.toLowerCase() === guardianEmail.toLowerCase()
    );

    if (!guardianUser) {
      throw new Error("Guardian must have a Vibe Check account. Please ask them to sign up first.");
    }

    // Verify guardian has is_parent set to true
    const { data: guardianProfile } = await supabase
      .from("profiles")
      .select("is_parent")
      .eq("id", guardianUser.id)
      .single();

    if (!guardianProfile?.is_parent) {
      throw new Error("Guardian account must be set up as a parent account.");
    }

    // Update child profile to link to parent user
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ 
        parent_id: guardianUser.id // Link to actual parent user ID
      })
      .eq("id", user.id);

    if (profileError) {
      console.error("Failed to update profile parent_id:", profileError);
      throw new Error("Failed to link parent account");
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
    
    // Handle zod validation errors
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ 
          ok: false,
          verified: false,
          error: "Invalid input format",
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(", ")
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    // Sanitize error messages for production
    const clientMessage = error.message?.includes("expired") || error.message?.includes("Invalid")
      ? error.message
      : "Verification failed. Please try again.";
    
    return new Response(
      JSON.stringify({ 
        ok: false,
        error: clientMessage,
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
