import { supabase } from "@/integrations/supabase/client";

// VAPID public key - this would normally be stored as an environment variable
// For now, we'll use the browser's default Push API without VAPID
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || null;

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
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    
    console.log('Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
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
export const subscribeToPushNotifications = async (): Promise<boolean> => {
  try {
    const support = checkPushNotificationSupport();
    if (!support.supported) {
      console.error('Push notifications not supported:', support.message);
      return false;
    }

    // Request permission
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return false;
    }

    // Register service worker
    const registration = await registerServiceWorker();
    if (!registration) {
      console.error('Service worker registration failed');
      return false;
    }

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;

    // Subscribe to push notifications
    const subscribeOptions: PushSubscriptionOptionsInit = {
      userVisibleOnly: true
    };

    // Add VAPID key if available
    if (VAPID_PUBLIC_KEY) {
      const key = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscribeOptions.applicationServerKey = key.buffer as ArrayBuffer;
    }

    const subscription = await registration.pushManager.subscribe(subscribeOptions);
    
    console.log('Push subscription:', subscription);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('User not authenticated');
      return false;
    }

    // Store subscription in database
    const subscriptionData = subscription.toJSON();
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert([{
        user_id: user.id,
        endpoint: subscription.endpoint,
        subscription_data: subscriptionData as any,
        device_info: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language
        }
      }], {
        onConflict: 'user_id,endpoint'
      });

    if (error) {
      console.error('Error storing subscription:', error);
      return false;
    }

    console.log('Push subscription stored successfully');
    return true;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return false;
  }
};

// Unsubscribe from push notifications
export const unsubscribeFromPushNotifications = async (): Promise<boolean> => {
  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) {
      console.log('No service worker registration found');
      return true;
    }

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      console.log('No push subscription found');
      return true;
    }

    // Unsubscribe from push
    await subscription.unsubscribe();
    console.log('Unsubscribed from push notifications');

    // Remove from database
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('endpoint', subscription.endpoint);
    }

    return true;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return false;
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

// Send a test notification
export const sendTestNotification = async (): Promise<void> => {
  const support = checkPushNotificationSupport();
  if (!support.supported || support.permission !== 'granted') {
    throw new Error('Notifications not supported or not permitted');
  }

  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification('Test Notification', {
    body: 'This is a test notification from Vibe Check',
    icon: '/vibe-check-logo.png',
    badge: '/vibe-check-logo.png',
    tag: 'test-notification'
  });
};
