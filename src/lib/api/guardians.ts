/**
 * Guardian API - RPC wrappers for guardian verification
 * Replaces direct view queries with secure RPC functions
 */

import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

// Type definitions for RPC returns
export type GuardianVerificationStatus = Database["public"]["Functions"]["get_guardian_verification_status"]["Returns"][0];

/**
 * Get guardian verification status for a child
 * @param childId - Child user ID to check
 * @returns Latest verification status or null
 */
export async function getGuardianVerificationStatus(
  childId: string
): Promise<GuardianVerificationStatus | null> {
  const { data, error } = await supabase.rpc("get_guardian_verification_status", {
    _child_id: childId,
  });

  if (error) {
    console.error("Error fetching guardian verification:", error);
    throw error;
  }

  return data && data.length > 0 ? data[0] : null;
}

/**
 * Get current user's guardian verification status (if they are a child)
 * @returns Verification status or null
 */
export async function getCurrentUserVerificationStatus(): Promise<GuardianVerificationStatus | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  return getGuardianVerificationStatus(user.id);
}

/**
 * Check if current user has verified guardian
 * @returns Boolean indicating if guardian is verified
 */
export async function hasVerifiedGuardian(): Promise<boolean> {
  const status = await getCurrentUserVerificationStatus();
  return status?.status === "verified";
}

/**
 * Check if guardian verification is pending
 * @param childId - Optional child ID (defaults to current user)
 * @returns Boolean indicating pending verification
 */
export async function hasVerificationPending(childId?: string): Promise<boolean> {
  const status = childId
    ? await getGuardianVerificationStatus(childId)
    : await getCurrentUserVerificationStatus();
  return status?.status === "pending";
}

/**
 * Legacy view adapter - logs warning if old view name is used
 * @deprecated Use getGuardianVerificationStatus instead
 */
export function warnDeprecatedViewUsage(viewName: string) {
  console.warn(
    `⚠️ DEPRECATED: Direct query to '${viewName}' view detected. ` +
    `This view has been replaced with RPC functions for security. ` +
    `Please use the appropriate function from src/lib/api/*.ts instead.`
  );
}
