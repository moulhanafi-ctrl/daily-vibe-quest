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

createRoot(document.getElementById("root")!).render(<App />);
