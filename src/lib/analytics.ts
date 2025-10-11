import { supabase } from "@/integrations/supabase/client";

export type EventType =
  | "onboarding_viewed"
  | "onboarding_completed"
  | "checkin_submitted"
  | "journal_saved"
  | "prompt_used"
  | "notification_sent"
  | "notification_opened"
  | "notification_clicked"
  | "room_report"
  | "room_mute"
  | "message_flagged"
  | "pdp_view"
  | "add_to_cart"
  | "purchase_succeeded"
  | "entitlement_granted"
  | "parent_alert_sent"
  | "parent_alert_opened";

interface TrackEventParams {
  eventType: EventType;
  metadata?: Record<string, any>;
  userId?: string;
}

export const trackEvent = async ({
  eventType,
  metadata = {},
  userId,
}: TrackEventParams) => {
  try {
    // Get current user if not provided
    let currentUserId = userId;
    if (!currentUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      currentUserId = user?.id;
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.log(`[Analytics Event] ${eventType}`, {
        userId: currentUserId,
        metadata,
        timestamp: new Date().toISOString(),
      });
    }

    // Insert event into database
    const { error } = await supabase.from("analytics_events").insert({
      user_id: currentUserId,
      event_type: eventType,
      event_metadata: metadata,
      page_url: window.location.pathname,
    });

    if (error) {
      console.error("Failed to track event:", error);
    }
  } catch (error) {
    console.error("Error tracking event:", error);
  }
};
