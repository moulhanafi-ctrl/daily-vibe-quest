import { supabase } from "@/integrations/supabase/client";

// Cache for VAPID public key
let cachedVapidKey: string | null = null;

// Fetch VAPID public key from backend
const getVapidPublicKey = async (): Promise<string | null> => {
  if (cachedVapidKey) {
    return cachedVapidKey;
  }

  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-vapid-key`);
    if (!response.ok) {
      console.error('Failed to fetch VAPID key');
      return null;
    }
    
    const { publicKey } = await response.json();
    cachedVapidKey = publicKey;
    return publicKey;
  } catch (error) {
    console.error('Error fetching VAPID key:', error);
    return null;
  }
};

export interface PushNotificationSupport {
  supported: boolean;
  permission: NotificationPermission;
  message?: string;
}

// Check if push notifications are supported
export const checkPushNotificationSupport = (): PushNotificationSupport => {
  // Check if service worker is supported
  if (!('serviceWorker' in navigator)) {
    return {
      supported: false,
      permission: 'denied',
      message: 'Service workers are not supported in this browser'
    };
  }

  // Check if push notifications are supported
  if (!('PushManager' in window)) {
    return {
      supported: false,
      permission: 'denied',
      message: 'Push notifications are not supported in this browser'
    };
  }

  // Check if Notification API is supported
  if (!('Notification' in window)) {
    return {
      supported: false,
      permission: 'denied',
      message: 'Notifications are not supported in this browser'
    };
  }

  return {
    supported: true,
    permission: Notification.permission
  };
};

// Register service worker
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  console.log('Push notifications are currently disabled (no service worker)');
  return null;
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  try {
    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
};

// Convert base64 to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray as unknown as Uint8Array;
}

// Subscribe to push notifications
export const subscribeToPushNotifications = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const support = checkPushNotificationSupport();
    if (!support.supported) {
      return { success: false, error: support.message || 'Push notifications not supported' };
    }

    // Request permission
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'permission_denied' };
    }

    // Register service worker
    const registration = await registerServiceWorker();
    if (!registration) {
      return { success: false, error: 'Push notifications are currently disabled' };
    }

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;

    // Get VAPID public key
    const vapidPublicKey = await getVapidPublicKey();
    if (!vapidPublicKey) {
      return { success: false, error: 'VAPID key not configured. Please contact support.' };
    }

    // Subscribe to push notifications
    const subscribeOptions: PushSubscriptionOptionsInit = {
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer
    };

    const subscription = await registration.pushManager.subscribe(subscribeOptions);
    
    console.log('Push subscription:', subscription);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get auth token for edge function
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'No active session' };
    }

    // Call edge function to store subscription
    const subscriptionData = subscription.toJSON();
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/subscribe-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        subscription: subscriptionData,
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error storing subscription:', error);
      return { success: false, error: error.error || 'Failed to store subscription' };
    }

    console.log('Push subscription stored successfully');
    return { success: true };
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
};

// Unsubscribe from push notifications
export const unsubscribeFromPushNotifications = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) {
      console.log('No service worker registration found');
      return { success: true };
    }

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      console.log('No push subscription found');
      return { success: true };
    }

    // Get auth token for edge function
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      // Call edge function to remove subscription
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/unsubscribe-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
        }),
      });
    }

    // Unsubscribe from push
    await subscription.unsubscribe();
    console.log('Unsubscribed from push notifications');

    return { success: true };
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
};

// Check if user is currently subscribed
export const isSubscribedToPushNotifications = async (): Promise<boolean> => {
  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) {
      return false;
    }

    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch (error) {
    console.error('Error checking push subscription:', error);
    return false;
  }
};

// Send a test notification via edge function
export const sendTestNotification = async (): Promise<void> => {
  const support = checkPushNotificationSupport();
  if (!support.supported || support.permission !== 'granted') {
    throw new Error('Notifications not supported or not permitted');
  }

  // Get auth token for edge function
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('No active session');
  }

  // Call edge function to send test notification
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-test-push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send test notification');
  }

  console.log('Test notification sent successfully');
};
