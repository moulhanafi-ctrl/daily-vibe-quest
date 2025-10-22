import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/i18n";
import { initSentry } from "./lib/sentry";
import { initPostHog } from "./lib/posthog";
import { registerSW } from 'virtual:pwa-register';

// Initialize Sentry
initSentry();

// Initialize PostHog
initPostHog();

// Register Service Worker with auto-update
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('New content available, updating...');
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
  onRegistered(registration) {
    console.log('Service Worker registered:', registration);
  },
  onRegisterError(error) {
    console.error('Service Worker registration error:', error);
  }
});

// Force cache clear for desktop session fix
const APP_VERSION = '2025-10-22-domain-fix';
const storedVersion = localStorage.getItem('app_version');
if (storedVersion !== APP_VERSION) {
  console.log('App version updated, clearing caches...');
  localStorage.setItem('app_version', APP_VERSION);
  // Clear any stale subscription flags
  localStorage.removeItem('subscriptionActive');
  localStorage.removeItem('userRole');
  
  // Force SW update and cache clear
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister();
      });
      // Also clear all caches
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach(name => caches.delete(name));
        });
      }
      window.location.reload();
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
