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
  | "focus_area_changed"
  | "legal_consent_accepted"
  | "legal_reconsent_required"
  | "legal_reconsent_accepted"
  | "guardian_verification_started"
  | "guardian_verified"
  | "guardian_failed"
  | "data_export_requested"
  | "data_export_ready"
  | "data_delete_requested"
  | "data_delete_completed"
  | "unsubscribe_clicked"
  | "notification_pref_updated"
  | "room_message_sent"
  | "incident_flagged"
  | "pdp_view"
  | "add_to_cart"
  | "purchase_succeeded"
  | "entitlement_granted"
  | "parent_alert_sent"
  | "parent_alert_opened"
  | "help_viewed"
  | "help_filter_changed"
  | "help_call_clicked"
  | "help_call"
  | "help_website_clicked"
  | "help_website"
  | "help_directions_clicked"
  | "help_report_submitted"
  | "help_local_ranked"
  | "help_radius_changed"
  | "help_national_viewed"
  | "help_search"
  | "trivia_round_opened"
  | "trivia_started"
  | "trivia_completed"
  | "trivia_score"
  | "trivia_streak_updated"
  | "trivia_reflection_opened"
  | "trivia_journal_opened"
  | "notif_trivia_sent"
  | "notif_trivia_opened"
  | "notif_trivia_clicked"
  | "i18n_missing_key"
  | "security_banner_viewed"
  | "security_banner_mark_done"
  | "health_auth_leaked_pw_check_pass"
  | "health_auth_leaked_pw_check_fail"
  | "help_view_all_therapists_clicked"
  | "therapist_results_viewed"
  | "therapist_card_website_clicked"
  | "therapist_card_directions_clicked"
  | "therapist_phone_clicked"
  | "therapist_website_clicked"
  | "therapist_directions_clicked"
  | "wellness_fetch_success"
  | "wellness_fetch_failure"
  | "wellness_embed_start"
  | "wellness_embed_end"
  | "wellness_unlock_success"
  | "wellness_fallback_used"
  | "homepage_mood_click"
  | "homepage_trial_cta_click"
  | "admin_dashboard_view"
  | "admin_subscribers_card_click"
  | "admin_store_view"
  | "admin_add_product"
  | "admin_edit_product"
  | "admin_remove_product";

interface TrackEventParams {
  eventType: EventType;
  metadata?: Record<string, any>;
  userId?: string;
  language?: string;
}

export const trackEvent = async ({
  eventType,
  metadata = {},
  userId,
  language,
}: TrackEventParams) => {
  try {
    // Get current user if not provided
    let currentUserId = userId;
    if (!currentUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      currentUserId = user?.id;
    }

    // Get language from localStorage if not provided
    let currentLanguage = language;
    if (!currentLanguage) {
      currentLanguage = localStorage.getItem('i18nextLng') || 'en';
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.log(`[Analytics Event] ${eventType}`, {
        userId: currentUserId,
        language: currentLanguage,
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
      language: currentLanguage,
    });

    if (error) {
      console.error("Failed to track event:", error);
    }
  } catch (error) {
    console.error("Error tracking event:", error);
  }
};
