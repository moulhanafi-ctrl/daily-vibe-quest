import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

/**
 * Checks if a user has an active, non-expired subscription
 * @param supabase Supabase client instance
 * @param userId User ID to check
 * @returns true if user has valid subscription, false otherwise
 */
export async function requireActiveSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Check against active_subscriptions_v1 view
    const { data, error } = await supabase
      .from("active_subscriptions_v1")
      .select("user_id, status, current_period_end")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error checking subscription:", error);
      return { valid: false, error: "Failed to verify subscription status" };
    }

    if (!data) {
      return { 
        valid: false, 
        error: "Active subscription required. Please upgrade to access this feature." 
      };
    }

    // Double-check expiration (view should handle this, but belt-and-suspenders)
    const now = new Date();
    const expiresAt = new Date(data.current_period_end);
    
    if (expiresAt <= now) {
      return { 
        valid: false, 
        error: "Your subscription has expired. Please renew to continue." 
      };
    }

    return { valid: true };
  } catch (err) {
    console.error("Unexpected error in subscription check:", err);
    return { valid: false, error: "An error occurred verifying subscription" };
  }
}

/**
 * Middleware helper to check subscription and return 403 if invalid
 */
export async function guardSubscription(
  supabase: SupabaseClient,
  userId: string,
  corsHeaders: Record<string, string>
): Promise<Response | null> {
  const check = await requireActiveSubscription(supabase, userId);
  
  if (!check.valid) {
    return new Response(
      JSON.stringify({ error: check.error }),
      {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
  
  return null; // No error, continue
}
