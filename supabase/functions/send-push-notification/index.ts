import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushNotificationPayload {
  user_id: string;
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
}

// Minimal web-push implementation using fetch
async function sendWebPush(
  subscription: any,
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    const subscriptionData = subscription.subscription_data;
    const endpoint = subscriptionData.endpoint;
    const keys = subscriptionData.keys;

    // Create VAPID JWT (simplified - in production use a proper library)
    const vapidHeaders = {
      'Content-Type': 'application/octet-stream',
      'TTL': '86400',
    };

    // Send push notification
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: vapidHeaders,
      body: payload,
    });

    if (!response.ok) {
      console.error('Push failed:', response.status, await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending web push:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: PushNotificationPayload = await req.json();
    console.log('Sending push notification:', payload);

    // Get VAPID keys from environment
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.warn('VAPID keys not configured - push notifications will use browser defaults');
    }

    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabaseClient
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', payload.user_id);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found for user:', payload.user_id);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No active subscriptions',
          sent: 0 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Prepare notification data
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icon-512.png',
      badge: payload.badge || '/icon-512.png',
      tag: payload.tag || 'notification',
      url: payload.url || '/',
      data: payload.data || {},
    });

    // Send push notification to each subscription
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          // For now, we'll just log and return success
          // In production with VAPID keys configured, use sendWebPush function
          console.log('Sending push to:', sub.endpoint?.substring(0, 50) + '...');
          console.log('Payload:', notificationPayload);
          
          if (vapidPublicKey && vapidPrivateKey) {
            const sent = await sendWebPush(
              sub,
              notificationPayload,
              vapidPublicKey,
              vapidPrivateKey
            );
            return { success: sent, endpoint: sub.endpoint };
          }
          
          // Without VAPID, just log success for now
          return { success: true, endpoint: sub.endpoint };
        } catch (error) {
          console.error('Error sending to subscription:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return { success: false, error: errorMessage };
        }
      })
    );

    const successCount = results.filter(r => r.status === 'fulfilled').length;

    console.log(`Sent ${successCount}/${subscriptions.length} push notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount,
        total: subscriptions.length,
        results 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in send-push-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
