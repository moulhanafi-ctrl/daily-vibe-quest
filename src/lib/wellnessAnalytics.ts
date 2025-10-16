import { trackEvent } from "./analytics";

export const wellnessEvents = {
  fetchSuccess: (weekKey: string, videoCount: number) => {
    trackEvent({
      eventType: "wellness_fetch_success",
      metadata: { week_key: weekKey, video_count: videoCount }
    });
  },

  fetchFailure: (error: string) => {
    trackEvent({
      eventType: "wellness_fetch_failure",
      metadata: { error }
    });
  },

  embedStart: (videoId: string, breakPosition: number) => {
    trackEvent({
      eventType: "wellness_embed_start",
      metadata: { video_id: videoId, break_position: breakPosition }
    });
  },

  embedEnd: (videoId: string, breakPosition: number, watchedSeconds: number) => {
    trackEvent({
      eventType: "wellness_embed_end",
      metadata: { 
        video_id: videoId, 
        break_position: breakPosition,
        watched_seconds: watchedSeconds 
      }
    });
  },

  unlockSuccess: (sessionNumber: number) => {
    trackEvent({
      eventType: "wellness_unlock_success",
      metadata: { session_number: sessionNumber }
    });
  },

  fallbackUsed: (reason: string) => {
    trackEvent({
      eventType: "wellness_fallback_used",
      metadata: { reason }
    });
  }
};
