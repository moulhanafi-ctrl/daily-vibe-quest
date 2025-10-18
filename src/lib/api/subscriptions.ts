/**
 * Subscription API - RPC wrappers for subscription management
 * Replaces direct view queries with secure RPC functions
 */

import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

// Type definitions for RPC returns
export type ActiveSubscription = Database["public"]["Functions"]["get_active_subscriptions_v1"]["Returns"][0];

/**
 * Get active subscriptions for a user
 * @param userId - Optional user ID (defaults to current user via RLS)
 * @returns Array of active/trialing subscriptions
 */
export async function getActiveSubscriptions(userId?: string) {
  const { data, error } = await supabase.rpc("get_active_subscriptions_v1", {
    _user_id: userId || null,
  });

  if (error) {
    console.error("Error fetching active subscriptions:", error);
    throw error;
  }

  return data as ActiveSubscription[];
}

/**
 * Get current user's active subscription
 * @returns Single subscription or null
 */
export async function getCurrentUserSubscription(): Promise<ActiveSubscription | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const subscriptions = await getActiveSubscriptions(user.id);
  return subscriptions.length > 0 ? subscriptions[0] : null;
}

/**
 * Check if current user has an active subscription
 * @returns Boolean indicating active subscription status
 */
export async function hasActiveSubscription(): Promise<boolean> {
  const subscription = await getCurrentUserSubscription();
  return subscription !== null;
}

/**
 * Legacy view adapter - logs warning if old view name is used
 * @deprecated Use getActiveSubscriptions instead
 */
export function warnDeprecatedViewUsage(viewName: string) {
  console.warn(
    `⚠️ DEPRECATED: Direct query to '${viewName}' view detected. ` +
    `This view has been replaced with RPC functions for security. ` +
    `Please use the appropriate function from src/lib/api/*.ts instead.`
  );
}
