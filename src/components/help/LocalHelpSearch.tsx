import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Phone, ExternalLink, Loader2, AlertCircle, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { ZipCodeModal } from "./ZipCodeModal";
import { useAdminCheck } from "@/hooks/useAdminCheck";

interface Provider {
  name: string;
  description?: string;
  website: string;
  phone: string;
  distanceKm: number;
  distanceMi: number;
  type?: string;
}

interface GeoLookupResponse {
  locals: Provider[];
  nationals: Provider[];
  location?: {
    lat: number;
    lng: number;
    city?: string;
    region?: string;
    country?: string;
  };
  country?: string;
  geocoder?: string;
  latencyMs?: number;
  localCount?: number;
  nationalCount?: number;
  error?: string;
  cached?: boolean;
}

const LocalHelpSearch = () => {
  const [searchParams] = useSearchParams();
  const [locals, setLocals] = useState<Provider[]>([]);
  const [nationals, setNationals] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zipCode, setZipCode] = useState("");
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const { isAdmin } = useAdminCheck();

  useEffect(() => {
    const zip = searchParams.get("zip");
    if (zip) {
      handleSearch(zip);
    }
  }, [searchParams]);

  const handleSearch = async (code: string) => {
    setZipCode(code);
    setLoading(true);
    setError(null);
    setDiagnostics(null);

    const startTime = Date.now();

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        "geo-lookup",
        {
          body: { code },
        }
      );

      const totalLatency = Date.now() - startTime;

      if (functionError) {
        throw functionError;
      }

      if (data.error && data.locals.length === 0) {
        setError(data.error);
      }

      setLocals(data.locals || []);
      setNationals(data.nationals || []);
      
      setDiagnostics({
        format: data.country || "Unknown",
        geocoder: data.geocoder || "none",
        serverLatency: data.latencyMs || 0,
        totalLatency,
        localCount: data.localCount || 0,
        nationalCount: data.nationalCount || 0,
        cached: data.cached || false,
        location: data.location
      });

      trackEvent({
        eventType: "help_search",
        metadata: { 
          code, 
          localCount: data.locals?.length || 0,
          nationalCount: data.nationals?.length || 0,
          geocoder: data.geocoder,
          latency: totalLatency
        },
      });
    } catch (err: any) {
      console.error("Search error:", err);
      setError(err.message || "Failed to search locations");
      setLocals([]);
      setNationals([]);
    } finally {
      setLoading(false);
    }
  };

  const QuickActions = () => {
    if (loading || locals.length > 0) return null;

    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Quick options if you're not finding what you need:
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => window.open("https://www.nationalhelpline.org", "_blank")}>
            Browse All Resources
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Find Help Near You</span>
            {isAdmin && diagnostics && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDiagnostics(!showDiagnostics)}
              >
                <Activity className="h-4 w-4 mr-2" />
                Diagnostics
              </Button>
            )}
          </CardTitle>
          <CardDescription>
            Search for therapists, crisis centers, and support groups in your area (US & Canada)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ZipCodeModal onSave={handleSearch} />
          
          <QuickActions />

          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {showDiagnostics && diagnostics && (
            <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
              <CardHeader>
                <CardTitle className="text-sm">🔍 Diagnostics (Admin Only)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <strong>Format:</strong> {diagnostics.format}
                  </div>
                  <div>
                    <strong>Geocoder:</strong> {diagnostics.geocoder}
                  </div>
                  <div>
                    <strong>Server Latency:</strong> {diagnostics.serverLatency}ms
                  </div>
                  <div>
                    <strong>Total Latency:</strong> {diagnostics.totalLatency}ms
                  </div>
                  <div>
                    <strong>Local Results:</strong> {diagnostics.localCount}
                  </div>
                  <div>
                    <strong>National Results:</strong> {diagnostics.nationalCount}
                  </div>
                  <div>
                    <strong>Cached:</strong> {diagnostics.cached ? "Yes" : "No"}
                  </div>
                  {diagnostics.location && (
                    <div className="col-span-2">
                      <strong>Location:</strong> {diagnostics.location.city}, {diagnostics.location.region}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Local Providers */}
      {locals.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Local Providers near {zipCode}
            </h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {locals.map((provider, idx) => (
              <Card key={idx} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{provider.name}</CardTitle>
                      {provider.description && (
                        <p className="text-sm text-muted-foreground">{provider.description}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {provider.distanceMi.toFixed(1)} mi
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {provider.phone && provider.phone !== "Information not available" && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        onClick={() =>
                          trackEvent({
                            eventType: "help_viewed",
                            metadata: { action: "call", provider: provider.name },
                          })
                        }
                      >
                        <a href={`tel:${provider.phone}`}>
                          <Phone className="h-4 w-4 mr-2" />
                          {provider.phone}
                        </a>
                      </Button>
                    )}

                    {provider.website && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        onClick={() =>
                          trackEvent({
                            eventType: "help_viewed",
                            metadata: { action: "website", provider: provider.name },
                          })
                        }
                      >
                        <a href={provider.website} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Website
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* National Resources - Always visible when search is done */}
      {(nationals.length > 0 || locals.length === 0) && !loading && zipCode && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              National Hotlines & Resources
            </CardTitle>
            {locals.length < 3 && locals.length > 0 && (
              <Alert className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Limited local results found. Here are national resources that can help immediately.
                </AlertDescription>
              </Alert>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {nationals.map((hotline, idx) => (
              <Card key={idx} className="border-2">
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold text-lg">{hotline.name}</h4>
                      {hotline.description && (
                        <p className="text-sm text-muted-foreground mt-1">{hotline.description}</p>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="lg"
                        asChild
                        onClick={() =>
                          trackEvent({
                            eventType: "help_viewed",
                            metadata: { action: "call", hotline: hotline.name },
                          })
                        }
                      >
                        <a href={`tel:${hotline.phone}`}>
                          <Phone className="h-4 w-4 mr-2" />
                          Call {hotline.phone}
                        </a>
                      </Button>

                      {hotline.website && (
                        <Button
                          variant="outline"
                          size="lg"
                          asChild
                          onClick={() =>
                            trackEvent({
                              eventType: "help_viewed",
                              metadata: { action: "website", hotline: hotline.name },
                            })
                          }
                        >
                          <a href={hotline.website} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Visit Website
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Card className="border-dashed">
              <CardContent className="pt-4">
                <div className="text-center space-y-2">
                  <p className="text-sm font-medium">Need more options?</p>
                  <Button
                    variant="outline"
                    asChild
                    onClick={() =>
                      trackEvent({
                        eventType: "help_viewed",
                        metadata: { action: "national_helpline_directory_clicked" },
                      })
                    }
                  >
                    <a href="https://www.nationalhelpline.org" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      National Helpline Directory
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LocalHelpSearch;
