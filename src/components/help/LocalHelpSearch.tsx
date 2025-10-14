// src/components/help/LocalHelpSearch.tsx
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  const [zip, setZip] = useState<string>("");
  const [radius, setRadius] = useState<number>(20);
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
      if (error) throw error;
      if (!data?.ok) {
        setError(data?.message || "Something went wrong.");
      } else {
        setResp(data);
        // Persist last successful query
        try {
          localStorage.setItem("vc_zip", data.query?.zip || z);
          localStorage.setItem("vc_radius", String(data.query?.radius_miles ?? r));
        } catch {}
      }
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
        <button
          className="underline"
          onClick={() => runSearch(resp.query?.zip || zip, 25)}
        >
          Try 25 miles
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
          {[15, 20, 25].map((r) => (
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

        {error && <div role="alert" className="text-red-600 text-sm">{error}</div>}
      </form>

      {/* Results */}
      {resp && (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border p-4">
            <h3 className="text-lg font-semibold">Therapists near me</h3>
            {resp.therapists && resp.therapists.length > 0 ? (
              <ul className="mt-2 space-y-3">
                {resp.therapists.map((t, i) => (
                  <li key={i} className="border rounded-xl p-3">
                    <div className="font-medium">{t.name}</div>
                    <div className="text-sm opacity-80">{t.address}</div>
                    <div className="text-sm mt-1">
                      {typeof t.distance_miles === "number" && `${t.distance_miles} mi`} away
                    </div>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm">
                      {t.phone && <a className="underline" href={`tel:${t.phone}`}>Call</a>}
                      {t.website && <a className="underline" href={t.website} target="_blank">Website</a>}
                      <a className="underline" href={t.directions_url} target="_blank">Directions</a>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm opacity-80">No results.</div>
            )}
            <QuickActions />
          </div>

          <div className="rounded-2xl border p-4">
            <h3 className="text-lg font-semibold">Crisis centers near me</h3>
            {resp.crisis_centers && resp.crisis_centers.length > 0 ? (
              <ul className="mt-2 space-y-3">
                {resp.crisis_centers.map((c, i) => (
                  <li key={i} className="border rounded-xl p-3">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm opacity-80">{c.address}</div>
                    <div className="text-sm mt-1">
                      {typeof c.distance_miles === "number" && `${c.distance_miles} mi`} away
                    </div>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm">
                      {c.phone && <a className="underline" href={`tel:${c.phone}`}>Call</a>}
                      {c.website && <a className="underline" href={c.website} target="_blank">Website</a>}
                      <a className="underline" href={c.directions_url} target="_blank">Directions</a>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm opacity-80">No results.</div>
            )}
            <QuickActions />
          </div>

          <div className="rounded-2xl border p-4">
            <h3 className="text-lg font-semibold">National hotlines</h3>
            <ul className="mt-2 space-y-2">
              {(resp.hotlines ?? []).map((h, i) => (
                <li key={i} className="text-sm">
                  <div className="font-medium">{h.label}</div>
                  <div className="opacity-80">
                    {h.call && <>Call: <a className="underline" href={`tel:${h.call}`}>{h.call}</a> </>}
                    {h.text && <span>— {h.text} </span>}
                    {h.url && <>— <a className="underline" href={h.url} target="_blank">Learn more</a></>}
                  </div>
                </li>
              ))}
            </ul>
          </div>

        </div>
      )}
    </div>
  );
}
