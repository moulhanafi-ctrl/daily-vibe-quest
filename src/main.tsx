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

// Force cache clear for desktop session fix (only on version change)
const APP_VERSION = '2025-10-22-auth-fix';
const storedVersion = localStorage.getItem('app_version');
if (storedVersion !== APP_VERSION) {
  console.log('App version updated, clearing auth cache...');
  localStorage.setItem('app_version', APP_VERSION);
  localStorage.removeItem('subscriptionActive');
  localStorage.removeItem('userRole');
}

createRoot(document.getElementById("root")!).render(<App />);
