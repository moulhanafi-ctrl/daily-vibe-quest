import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { verifyHmacSignature } from "../_shared/hmac-validation.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // SECURITY: Verify HMAC signature for cron-triggered function
  if (!await verifyHmacSignature(req)) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized: Invalid signature' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if Mostapha is enabled
    const { data: arthurConfig } = await supabaseClient
      .from('arthur_config')
      .select('*')
      .single();

    if (!arthurConfig || !arthurConfig.enabled) {
      console.log('Mostapha is disabled');
      return new Response(
        JSON.stringify({ success: false, message: 'Mostapha disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get all users with Mostapha enabled
    const { data: usersWithPrefs } = await supabaseClient
      .from('arthur_preferences')
      .select('user_id, preferred_time, timezone, max_daily_messages')
      .eq('enabled', true);

    if (!usersWithPrefs || usersWithPrefs.length === 0) {
      console.log('No users with Mostapha enabled');
      return new Response(
        JSON.stringify({ success: true, message: 'No users to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    let notificationsSent = 0;

    for (const userPref of usersWithPrefs) {
      try {
        // Check daily message limit
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { data: todaysDeliveries, error: countError } = await supabaseClient
          .from('arthur_deliveries')
          .select('id')
          .eq('user_id', userPref.user_id)
          .gte('delivered_at', today.toISOString());

        if (countError) {
          console.error('Error checking delivery count:', countError);
          continue;
        }

        if (todaysDeliveries && todaysDeliveries.length >= userPref.max_daily_messages) {
          console.log(`User ${userPref.user_id} has reached daily limit`);
          continue;
        }

        // Get user profile for personalization
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('id, first_name, age_group, selected_focus_areas, parent_id')
          .eq('id', userPref.user_id)
          .single();

        if (!profile || !profile.selected_focus_areas || profile.selected_focus_areas.length === 0) {
          console.log(`No profile or focus areas for user ${userPref.user_id}`);
          continue;
        }

        // Get user's recent mood trend (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { data: recentMoods } = await supabaseClient
          .from('moods')
          .select('mood, intensity')
          .eq('user_id', userPref.user_id)
          .gte('created_at', sevenDaysAgo.toISOString());

        // Determine time of day for template routing
        const currentHour = new Date().getHours();
        const timeOfDay = currentHour < 12 ? 'morning' : 'evening';

        // Find best template based on focus areas, time of day, and recent deliveries
        let selectedTemplate = null;
        
        for (const focusArea of profile.selected_focus_areas) {
          // Check recent deliveries for this focus area to respect cooldown
          const { data: recentDeliveries } = await supabaseClient
            .from('arthur_deliveries')
            .select('template_id, delivered_at, arthur_templates(cooldown_days, focus_area)')
            .eq('user_id', userPref.user_id)
            .order('delivered_at', { ascending: false })
            .limit(10);

          // Get available templates for this focus area, preferring time-specific ones
          const { data: templates } = await supabaseClient
            .from('arthur_templates')
            .select('*')
            .eq('focus_area', focusArea)
            .eq('age_group', profile.age_group)
            .eq('active', true)
            .order('priority', { ascending: true });

          if (!templates || templates.length === 0) continue;

          // Filter out templates that are in cooldown
          const availableTemplates = templates.filter(template => {
            const recentDelivery = recentDeliveries?.find(
              (d: any) => d.template_id === template.id
            );
            
            if (!recentDelivery) return true;
            
            const daysSinceDelivery = Math.floor(
              (Date.now() - new Date(recentDelivery.delivered_at).getTime()) / (1000 * 60 * 60 * 24)
            );
            
            return daysSinceDelivery >= template.cooldown_days;
          });

          // First try to find a time-specific template
          const timeSpecificTemplate = availableTemplates.find(t => t.time_of_day === timeOfDay);
          if (timeSpecificTemplate) {
            selectedTemplate = timeSpecificTemplate;
            break;
          }

          // Fall back to any available template
          if (availableTemplates.length > 0) {
            selectedTemplate = availableTemplates[0];
            break;
          }
        }

        if (!selectedTemplate) {
          console.log(`No available template for user ${userPref.user_id}`);
          continue;
        }

        // Personalize the message (replace {first_name} if present)
        let personalizedContent = selectedTemplate.content;
        if (profile.first_name) {
          personalizedContent = personalizedContent.replace(/{first_name}/g, profile.first_name);
        }

        // Create notification delivery record
        const { data: delivery, error: deliveryError } = await supabaseClient
          .from('arthur_deliveries')
          .insert({
            user_id: userPref.user_id,
            template_id: selectedTemplate.id,
            message_type: selectedTemplate.message_type,
            content_sent: personalizedContent
          })
          .select()
          .single();

        if (deliveryError) {
          console.error('Error creating delivery:', deliveryError);
          continue;
        }

        // Create in-app notification
        await supabaseClient
          .from('notification_events')
          .insert({
            child_id: userPref.user_id,
            parent_id: profile.parent_id || userPref.user_id, // Self-notify if no parent
            event_type: 'digest',
            payload: {
              mostapha_message: personalizedContent,
              message_type: selectedTemplate.message_type,
              timestamp: new Date().toISOString()
            }
          });

        notificationsSent++;
        console.log(`Sent Mostapha notification to user ${userPref.user_id}`);

      } catch (userError) {
        console.error(`Error processing user ${userPref.user_id}:`, userError);
        continue;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${notificationsSent} Mostapha notifications` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('Error in send-arthur-notifications:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
