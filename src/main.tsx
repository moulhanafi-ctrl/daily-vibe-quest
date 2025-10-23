import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/i18n";
import { initSentry } from "./lib/sentry";
import { initPostHog } from "./lib/posthog";

// Initialize Sentry
initSentry();

// Initialize PostHog
initPostHog();

// Aggressively unregister any existing service workers to prevent stale caches
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const reg of regs) {
      reg.unregister().catch(() => {});
    }
  });
  // Also clear existing caches (best-effort)
  if ((window as any).caches?.keys) {
    caches
      .keys()
      .then((keys) => keys.forEach((k) => caches.delete(k)))
      .catch(() => {});
  }
}

createRoot(document.getElementById("root")!).render(<App />);
