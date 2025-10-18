/**
 * Family API - RPC wrappers for family management
 * Replaces direct view queries with secure RPC functions
 */

import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

// Type definitions for RPC returns
export type FamilyMember = Database["public"]["Functions"]["get_family_members_view"]["Returns"][0];

/**
 * Get family members for a specific family
 * @param familyId - Optional family ID (if null, returns all accessible families)
 * @returns Array of family members with status and invite information
 */
export async function getFamilyMembers(familyId?: string) {
  const { data, error } = await supabase.rpc("get_family_members_view", {
    _family_id: familyId || null,
  });

  if (error) {
    console.error("Error fetching family members:", error);
    throw error;
  }

  return data as FamilyMember[];
}

/**
 * Get current user's family members
 * @returns Array of family members for user's primary family
 */
export async function getCurrentUserFamilyMembers(): Promise<FamilyMember[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // First get the user's family ID
  const { data: familyData } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", user.id)
    .single();

  if (!familyData) return [];

  return getFamilyMembers(familyData.family_id);
}

/**
 * Get family member by ID
 * @param memberId - Member ID to lookup
 * @returns Single family member or null
 */
export async function getFamilyMemberById(memberId: string): Promise<FamilyMember | null> {
  const members = await getFamilyMembers();
  return members.find(m => m.id === memberId) || null;
}

/**
 * Get active family members (excluding expired invites)
 * @param familyId - Optional family ID
 * @returns Array of active members
 */
export async function getActiveFamilyMembers(familyId?: string): Promise<FamilyMember[]> {
  const members = await getFamilyMembers(familyId);
  return members.filter(m => m.status === "active");
}

/**
 * Get pending family invites
 * @param familyId - Optional family ID
 * @returns Array of pending invites
 */
export async function getPendingFamilyInvites(familyId?: string): Promise<FamilyMember[]> {
  const members = await getFamilyMembers(familyId);
  return members.filter(m => m.status === "pending");
}

/**
 * Legacy view adapter - logs warning if old view name is used
 * @deprecated Use getFamilyMembers instead
 */
export function warnDeprecatedViewUsage(viewName: string) {
  console.warn(
    `⚠️ DEPRECATED: Direct query to '${viewName}' view detected. ` +
    `This view has been replaced with RPC functions for security. ` +
    `Please use the appropriate function from src/lib/api/*.ts instead.`
  );
}
