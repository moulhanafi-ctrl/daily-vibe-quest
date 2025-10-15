import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Brain, Ambulance, Phone, Navigation, PhoneCall, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";
const US_ZIP = /^\d{5}(?:-\d{4})?$/;
const CA_POSTAL = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;

function normalizePostal(raw: string) {
  let s = (raw || "").trim();
  if (CA_POSTAL.test(s)) {
    s = s.toUpperCase().replace(/\s+/g, "");
    s = s.slice(0, 3) + " " + s.slice(3);
  }
  return s;
}

function sanitizePhone(phone?: string | null) {
  return phone ? phone.replace(/[^\d+]/g, "") : "";
}

function isValidPhone(phone?: string | null) {
  const s = sanitizePhone(phone);
  return s.length >= 7;
}


type ResultItem = {
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  distance_miles: number;
  directions_url: string;
};

type ApiResponse = {
  ok: boolean;
  message?: string;
  error?: string;
  countryCode?: "US" | "CA";
  query?: { zip: string; radius_miles: number };
  center?: { lat: number; lng: number };
  therapists?: ResultItem[];
  crisis_centers?: ResultItem[];
  hotlines?: { label: string; call?: string; text?: string; url?: string }[];
};

export default function LocalHelpSearch() {
  const navigate = useNavigate();
  const [zip, setZip] = useState<string>("");
  const [radius, setRadius] = useState<number>(25);
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runSearch(z: string, r: number) {
    setLoading(true);
    setError(null);
    setResp(null);
    try {
      const { data, error } = await supabase.functions.invoke<ApiResponse>("local-help", {
        body: { zip_code: z, radius: r },
      });

      // TEMP DEBUG LOGS
      console.log("[local-help] data:", data);
      console.log("[local-help] error:", error);

      if (error) {
        console.error("[local-help] invoke error:", error);
        setError(error.message || "Network error");
        setLoading(false);
        return;
      }
      if (!data?.ok) {
        setError(data?.message || data?.error || "Something went wrong.");
        setLoading(false);
        return;
      }

      setResp(data);
      try {
        localStorage.setItem("vc_zip", data.query?.zip || z);
        localStorage.setItem("vc_radius", String(data.query?.radius_miles ?? r));
      } catch {}
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = zip.trim();
    if (!US_ZIP.test(trimmed) && !CA_POSTAL.test(trimmed)) {
      setError("Please enter a valid US ZIP or Canadian postal code (e.g., 02115 or M5V 2T6).");
      return;
    }
    const normalized = normalizePostal(trimmed);
    runSearch(normalized, radius);
  }

  function QuickActions() {
    if (!resp) return null;
    const hasTher = (resp.therapists ?? []).length > 0;
    const hasCrisis = (resp.crisis_centers ?? []).length > 0;
    if (hasTher || hasCrisis) return null;
    return (
      <div className="mt-2 text-sm">
        No results within {resp.query?.radius_miles} miles.{" "}
        <button className="underline" onClick={() => runSearch(resp.query?.zip || zip, 75)}>
          Try 75 miles
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={onSubmit} className="flex flex-col gap-3 p-4 rounded-2xl shadow-md border">
        <label className="text-sm font-medium" htmlFor="zip">
          Enter your ZIP or postal code (US & Canada)
        </label>
        <input
          id="zip"
          inputMode="text"
          placeholder="e.g., 02115 or M5V 2T6"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          className="border rounded-xl px-3 py-2"
          aria-label="ZIP or Postal Code"
        />

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Radius:</span>
          {[25, 50, 75].map((r) => (
            <button
              type="button"
              key={r}
              onClick={() => setRadius(r)}
              className={`px-3 py-1 rounded-full border ${radius === r ? "bg-black text-white" : "bg-white"}`}
              aria-pressed={radius === r}
            >
              {r} mi
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white rounded-xl px-4 py-2 disabled:opacity-60"
        >
          {loading ? "Searching…" : "Find help near me"}
        </button>

        {error && (
          <div role="alert" className="text-red-600 text-sm">
            {error}
          </div>
        )}
      </form>

      {/* Loading State */}
      {loading && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/60 backdrop-blur-sm animate-fade-in">
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary/80 mb-4" aria-hidden="true" />
            <p className="text-muted-foreground text-lg" aria-live="polite">Finding trusted resources near you…</p>
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && resp && (
        <div className="mt-8 space-y-8 pb-8 w-full overflow-x-hidden">
          {/* Therapists Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => {
                  trackEvent({ 
                    eventType: "help_view_all_therapists_clicked", 
                    metadata: { zip: resp.query?.zip || zip, radius: resp.query?.radius_miles || radius } 
                  });
                  navigate(`/help/therapists?zip=${resp.query?.zip || zip}&radius=${resp.query?.radius_miles || radius}`);
                }}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                aria-label="View all therapists"
              >
                <Brain className="h-6 w-6 text-[#007BFF]" />
                <h3 className="text-xl font-bold text-foreground">Therapists near me</h3>
              </button>
              <button
                onClick={() => {
                  trackEvent({ 
                    eventType: "help_view_all_therapists_clicked", 
                    metadata: { zip: resp.query?.zip || zip, radius: resp.query?.radius_miles || radius } 
                  });
                  navigate(`/help/therapists?zip=${resp.query?.zip || zip}&radius=${resp.query?.radius_miles || radius}`);
                }}
                className="text-sm font-medium text-[#007BFF] hover:text-[#0056b3] transition-colors flex items-center gap-1"
              >
                View all <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            {resp.therapists && resp.therapists.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                {resp.therapists.map((t, i) => (
                  <div
                    key={i}
                    className="bg-card rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden animate-fade-in border border-border"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    <div className="h-2 bg-[#007BFF]"></div>
                    <div className="p-4">
                      <h4 className="font-semibold text-lg text-foreground mb-2">{t.name}</h4>
                      {t.address ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-muted-foreground hover:text-primary transition-colors text-left group inline-flex items-start gap-1.5 mb-1"
                          aria-label={`Get directions to ${t.name}`}
                        >
                          <span aria-hidden>📍</span>
                          <span className="group-hover:underline">{t.address}</span>
                        </a>
                      ) : (
                        <p className="text-sm text-muted-foreground mb-1 opacity-60">Address unavailable</p>
                      )}
                      <p className="text-sm font-medium text-foreground mb-4">
                        {typeof t.distance_miles === "number" && `${t.distance_miles} mi away`}
                      </p>
                      <div className="flex gap-2">
                        <a
                          href={t.directions_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                        >
                          <Navigation className="h-4 w-4" />
                          Directions
                        </a>
                        {isValidPhone(t.phone) && (
                          <a
                            href={`tel:${sanitizePhone(t.phone)}`}
                            aria-label={`Call ${t.name}`}
                            className="flex items-center justify-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
                          >
                            <PhoneCall className="h-4 w-4" />
                            Call
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground">No results found.</div>
            )}
            <QuickActions />
          </div>

          {/* Crisis Centers Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Ambulance className="h-6 w-6 text-[#DC3545]" />
              <h3 className="text-xl font-bold text-foreground">Crisis centers near me</h3>
            </div>
            {resp.crisis_centers && resp.crisis_centers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                {resp.crisis_centers.map((c, i) => (
                  <div
                    key={i}
                    className="bg-card rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden animate-fade-in border border-border"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    <div className="h-2 bg-[#DC3545]"></div>
                    <div className="p-4">
                      <h4 className="font-semibold text-lg text-foreground mb-2">{c.name}</h4>
                      {c.address ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-muted-foreground hover:text-primary transition-colors text-left group inline-flex items-start gap-1.5 mb-1"
                          aria-label={`Get directions to ${c.name}`}
                        >
                          <span aria-hidden>📍</span>
                          <span className="group-hover:underline">{c.address}</span>
                        </a>
                      ) : (
                        <p className="text-sm text-muted-foreground mb-1 opacity-60">Address unavailable</p>
                      )}
                      <p className="text-sm font-medium text-foreground mb-4">
                        {typeof c.distance_miles === "number" && `${c.distance_miles} mi away`}
                      </p>
                      <div className="flex gap-2">
                        <a
                          href={c.directions_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                        >
                          <Navigation className="h-4 w-4" />
                          Directions
                        </a>
                        {isValidPhone(c.phone) && (
                          <a
                            href={`tel:${sanitizePhone(c.phone)}`}
                            aria-label={`Call ${c.name}`}
                            className="flex items-center justify-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
                          >
                            <PhoneCall className="h-4 w-4" />
                            Call
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground">No results found.</div>
            )}
            <QuickActions />
          </div>

          {/* National Hotlines Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Phone className="h-6 w-6 text-[#FFC107]" />
              <h3 className="text-xl font-bold text-foreground">National hotlines</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
              {(resp.hotlines ?? []).map((h, i) => (
                <div
                  key={i}
                  className="bg-card rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden animate-fade-in border border-border"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="h-2 bg-[#FFC107]"></div>
                  <div className="p-4">
                    <h4 className="font-semibold text-lg text-foreground mb-2">{h.label}</h4>
                    <div className="space-y-2">
                      {h.call && (
                        <a
                          href={`tel:${h.call}`}
                          className="flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <PhoneCall className="h-4 w-4" />
                          {h.call}
                        </a>
                      )}
                      {h.text && <p className="text-sm text-muted-foreground">{h.text}</p>}
                      {h.url && (
                        <a
                          href={h.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-sm text-primary hover:underline"
                        >
                          Learn more →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
