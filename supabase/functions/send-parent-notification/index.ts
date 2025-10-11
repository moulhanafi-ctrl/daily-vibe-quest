import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  childId: string;
  eventType: 'checkin' | 'journal_shared' | 'crisis';
  payload: {
    mood?: string;
    emoji?: string;
    title?: string;
    preview?: string;
    category?: string;
    timestamp: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { childId, eventType, payload }: NotificationRequest = await req.json();

    // Get child's profile to find parent
    const { data: childProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('parent_id, username')
      .eq('id', childId)
      .single();

    if (profileError || !childProfile?.parent_id) {
      console.log('No parent linked for child:', childId);
      return new Response(
        JSON.stringify({ success: false, message: 'No parent linked' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get parent notification preferences
    const { data: preferences } = await supabaseClient
      .from('parent_notification_preferences')
      .select('*')
      .eq('parent_id', childProfile.parent_id)
      .single();

    // Check if notifications are enabled for this type
    if (preferences) {
      if (eventType === 'checkin' && !preferences.checkin_alerts) {
        console.log('Check-in alerts disabled for parent');
        return new Response(
          JSON.stringify({ success: false, message: 'Alerts disabled' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
      if (eventType === 'journal_shared' && !preferences.journal_alerts) {
        console.log('Journal alerts disabled for parent');
        return new Response(
          JSON.stringify({ success: false, message: 'Alerts disabled' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      // Check quiet hours (crisis events bypass quiet hours)
      if (eventType !== 'crisis' && preferences.quiet_hours_start && preferences.quiet_hours_end) {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`;
        
        const isInQuietHours = (current: string, start: string, end: string) => {
          if (start < end) {
            return current >= start && current < end;
          } else {
            // Quiet hours span midnight
            return current >= start || current < end;
          }
        };

        if (isInQuietHours(currentTime, preferences.quiet_hours_start, preferences.quiet_hours_end)) {
          console.log('In quiet hours, notification queued for digest');
          // TODO: Queue for daily digest
          return new Response(
            JSON.stringify({ success: true, message: 'Queued for digest' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        }
      }
    }

    // Create notification event
    const { data: notification, error: notificationError } = await supabaseClient
      .from('notification_events')
      .insert({
        child_id: childId,
        parent_id: childProfile.parent_id,
        event_type: eventType,
        payload: {
          ...payload,
          child_username: childProfile.username
        }
      })
      .select()
      .single();

    if (notificationError) {
      throw notificationError;
    }

    console.log('Notification created:', notification.id);

    return new Response(
      JSON.stringify({ success: true, notification }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('Error sending notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
