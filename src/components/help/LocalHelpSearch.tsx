import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Phone, ExternalLink, Loader2, AlertCircle, Activity, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { ZipCodeModal } from "./ZipCodeModal";
import { useAdminCheck } from "@/hooks/useAdminCheck";

interface Provider {
  name: string;
  description?: string;
  website: string | null;
  phone: string | null;
  distanceKm: number;
  distanceMi: number;
  type?: string;
  address?: string | null;
  openNow?: boolean | null;
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
  
  // New filter states
  const [filterType, setFilterType] = useState<"all" | "therapists" | "crisis">("all");
  const [openNow, setOpenNow] = useState(false);
  const [radiusKm, setRadiusKm] = useState(40);
  const [whereInfo, setWhereInfo] = useState<any>(null);

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
    setWhereInfo(null);

    const startTime = Date.now();

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        "help-nearby",
        {
          body: { 
            code,
            radiusKm,
            filters: {
              openNow,
              type: filterType,
            },
          },
        }
      );

      const totalLatency = Date.now() - startTime;

      if (functionError) {
        throw functionError;
      }

      if (data.error) {
        setError(data.message || data.error);
      }

      setLocals(data.locals || []);
      setNationals(data.nationals || []);
      setWhereInfo(data.where || null);
      
      setDiagnostics({
        format: data.where?.country || "Unknown",
        geocoder: data.meta?.source || "none",
        serverLatency: data.meta?.tookMs || 0,
        totalLatency,
        localCount: data.locals?.length || 0,
        nationalCount: data.nationals?.length || 0,
        cached: data.meta?.cache === "HIT",
        location: data.where
      });

      trackEvent({
        eventType: "help_search",
        metadata: { 
          code, 
          localCount: data.locals?.length || 0,
          nationalCount: data.nationals?.length || 0,
          geocoder: data.meta?.source,
          latency: totalLatency,
          radiusKm,
          filterType,
          openNow,
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
          <div className="space-y-4">
            <ZipCodeModal onSave={handleSearch} />
            
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="type-filter" className="text-sm font-medium mb-2 block">
                  Type
                </Label>
                <Tabs value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="therapists">Therapists</TabsTrigger>
                    <TabsTrigger value="crisis">Crisis</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              
              <div className="flex-1">
                <Label htmlFor="radius-select" className="text-sm font-medium mb-2 block">
                  Radius
                </Label>
                <Select value={radiusKm.toString()} onValueChange={(v) => setRadiusKm(parseInt(v))}>
                  <SelectTrigger id="radius-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 km (6 mi)</SelectItem>
                    <SelectItem value="25">25 km (16 mi)</SelectItem>
                    <SelectItem value="40">40 km (25 mi)</SelectItem>
                    <SelectItem value="80">80 km (50 mi)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="open-now" 
                    checked={openNow} 
                    onCheckedChange={setOpenNow}
                  />
                  <Label htmlFor="open-now" className="text-sm cursor-pointer">
                    Open now
                  </Label>
                </div>
              </div>
            </div>
          </div>
          
          <QuickActions />

          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
            </div>
          )}

          {error && !loading && (
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
      {locals.length > 0 && whereInfo && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">
                Local Providers near {zipCode}
              </h3>
              {whereInfo.city && whereInfo.region && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {whereInfo.city}, {whereInfo.region}
                </p>
              )}
            </div>
            <Badge variant="secondary">{locals.length} found</Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
            {locals.map((provider, idx) => (
              <Card key={idx} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <CardTitle className="text-base sm:text-lg leading-tight break-words">
                        {provider.name}
                      </CardTitle>
                      {provider.type && (
                        <Badge variant="outline" className="text-xs">
                          {provider.type}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant="outline" className="whitespace-nowrap">
                        {provider.distanceMi} mi
                      </Badge>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {provider.distanceKm} km
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {provider.address && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{provider.address}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-2">
                    {provider.phone && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="flex-1 sm:flex-none"
                        onClick={() =>
                          trackEvent({
                            eventType: "help_viewed",
                            metadata: { action: "call", provider: provider.name },
                          })
                        }
                      >
                        <a href={`tel:${provider.phone}`}>
                          <Phone className="h-4 w-4 mr-2" />
                          Call
                        </a>
                      </Button>
                    )}

                    {provider.website && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="flex-1 sm:flex-none"
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
      
      {/* Empty state when no locals found */}
      {!loading && zipCode && locals.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center space-y-2">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="font-medium">No local providers found</p>
            <p className="text-sm text-muted-foreground">
              We couldn't find nearby locations. Try a larger radius or call a national hotline below.
            </p>
          </CardContent>
        </Card>
      )}

      {/* National Resources - Always visible when search is done */}
      {(nationals.length > 0 || locals.length === 0) && !loading && zipCode && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              National Hotlines & Resources
            </CardTitle>
            {locals.length > 0 && locals.length < 5 && (
              <CardDescription>
                Limited local results. National resources are available 24/7.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {nationals.map((hotline, idx) => (
              <Card key={idx} className="border-2">
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-base sm:text-lg">{hotline.name}</h4>
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                      {hotline.phone && (
                        <Button
                          size="lg"
                          className="flex-1"
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
                      )}

                      {hotline.website && (
                        <Button
                          variant="outline"
                          size="lg"
                          className="flex-1"
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
                            Website
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LocalHelpSearch;
