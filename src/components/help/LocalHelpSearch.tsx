import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Globe, Navigation, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LocalHelpLocation {
  name: string;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  distance_miles?: number;
  directions_url?: string;
}

interface Hotline {
  label: string;
  call?: string;
  text?: string;
  url?: string;
}

interface LocalHelpResponse {
  ok: boolean;
  countryCode: "US" | "CA";
  query: {
    zip: string;
    radius_miles: number;
  };
  center: {
    lat: number;
    lng: number;
  };
  therapists: LocalHelpLocation[];
  crisis_centers: LocalHelpLocation[];
  hotlines: Hotline[];
  error?: string;
  message?: string;
}

export const LocalHelpSearch = () => {
  const [zip, setZip] = useState("");
  const [radius, setRadius] = useState<number>(20);
  const [loading, setLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LocalHelpResponse | null>(null);
  const { toast } = useToast();

  // Load user's saved ZIP from profile
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("zipcode")
            .eq("id", user.id)
            .single();
          
          if (profile?.zipcode) {
            setZip(profile.zipcode);
            // Auto-search with saved ZIP
            await performSearch(profile.zipcode, radius);
          }
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadInitialData();
  }, []);

  async function performSearch(zipCode: string, searchRadius: number) {
    const trimmed = zipCode.trim();
    
    if (!trimmed) {
      setError("Please enter a ZIP code or postal code");
      setData(null);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { data: response, error: fnError } = await supabase.functions.invoke<LocalHelpResponse>(
        "local-help",
        {
          body: { zip_code: trimmed, radius: searchRadius },
        }
      );

      if (fnError) {
        console.error("Edge function error:", fnError);
        throw new Error("Could not fetch local resources");
      }

      if (!response?.ok) {
        throw new Error(response?.message || response?.error || "Invalid response from server");
      }

      setData(response);

      // Track successful search
      await trackEvent({
        eventType: "help_local_ranked",
        metadata: {
          zip: response.query.zip,
          radius: searchRadius,
          country: response.countryCode,
          therapists_count: response.therapists.length,
          crisis_count: response.crisis_centers.length,
        },
      });

      toast({
        title: "Location found",
        description: `Showing resources near ${response.query.zip}`,
      });
    } catch (err: any) {
      console.error("Local help search failed:", err);
      const errorMessage = err.message || "We couldn't fetch local results right now.";
      setError(errorMessage);
      
      // Track error
      await trackEvent({
        eventType: "help_local_ranked",
        metadata: { zip: trimmed, error: errorMessage, success: false },
      });

      toast({
        title: "Search error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function onSearch(e?: React.FormEvent) {
    e?.preventDefault();
    await performSearch(zip, radius);
  }

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle>Find Local Help</CardTitle>
          <CardDescription>
            Search for mental health resources near you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label htmlFor="zip" className="text-sm font-medium mb-1 block">
                ZIP / Postal Code
              </label>
              <Input
                id="zip"
                maxLength={10}
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="e.g., 02115 or M5V 2T6"
                disabled={loading}
              />
            </div>
            <div className="w-full sm:w-32">
              <label htmlFor="radius" className="text-sm font-medium mb-1 block">
                Radius (mi)
              </label>
              <select
                id="radius"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                disabled={loading}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value={15}>15</option>
                <option value={20}>20</option>
                <option value={25}>25</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <MapPin className="mr-2 h-4 w-4" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </form>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Section 1: Therapists Near Me */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🩺 Licensed Mental Health Professionals Near Me
          </CardTitle>
          <CardDescription>
            {data ? `Licensed mental health professionals near ${data.query.zip}` : 'Search above to find licensed providers in your area'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!data ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Enter your ZIP code above to find licensed mental health professionals near you.
              </AlertDescription>
            </Alert>
          ) : data.therapists.length === 0 ? (
            <Alert>
              <AlertDescription>
                No licensed providers found within {data.query.radius_miles} miles of {data.query.zip}. Try expanding your search radius or check national resources below.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.therapists.map((therapist, idx) => (
                <Card key={idx}>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <h4 className="font-semibold leading-tight">
                        {therapist.name}
                      </h4>
                      {therapist.address && (
                        <p className="text-sm text-muted-foreground">
                          {therapist.address}
                        </p>
                      )}
                      {therapist.distance_miles !== undefined && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Navigation className="h-3 w-3" />
                          ~{therapist.distance_miles} mi away
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 pt-2">
                        {therapist.phone && (
                          <Button asChild variant="default" size="sm">
                            <a href={`tel:${therapist.phone}`}>
                              <Phone className="mr-1 h-3 w-3" />
                              Call
                            </a>
                          </Button>
                        )}
                        {therapist.website && (
                          <Button asChild variant="outline" size="sm">
                            <a href={therapist.website} target="_blank" rel="noopener noreferrer">
                              <Globe className="mr-1 h-3 w-3" />
                              Website
                            </a>
                          </Button>
                        )}
                        {therapist.directions_url && (
                          <Button asChild variant="outline" size="sm">
                            <a href={therapist.directions_url} target="_blank" rel="noopener noreferrer">
                              <MapPin className="mr-1 h-3 w-3" />
                              Directions
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Crisis Centers Near Me */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🚨 Crisis Centers Near Me
          </CardTitle>
          <CardDescription>
            {data ? `Immediate crisis support near ${data.query.zip}` : 'Search above to find crisis centers in your area'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!data ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Enter your ZIP code above to find crisis centers near you.
              </AlertDescription>
            </Alert>
          ) : data.crisis_centers.length === 0 ? (
            <Alert className="border-destructive/50">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <AlertDescription>
                <strong>No local crisis centers found within {data.query.radius_miles} miles.</strong> Please use our national crisis resources below or dial 988 for immediate support.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.crisis_centers.map((center, idx) => (
                <Card key={idx} className="relative border-destructive/20">
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <h4 className="font-semibold leading-tight">
                        {center.name}
                      </h4>
                      {center.address && (
                        <p className="text-sm text-muted-foreground">
                          {center.address}
                        </p>
                      )}
                      {center.distance_miles !== undefined && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Navigation className="h-3 w-3" />
                          ~{center.distance_miles} mi away
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 pt-2">
                        {center.phone && (
                          <Button asChild variant="default" size="sm">
                            <a href={`tel:${center.phone}`}>
                              <Phone className="mr-1 h-3 w-3" />
                              Call Now
                            </a>
                          </Button>
                        )}
                        {center.website && (
                          <Button asChild variant="outline" size="sm">
                            <a href={center.website} target="_blank" rel="noopener noreferrer">
                              <Globe className="mr-1 h-3 w-3" />
                              Website
                            </a>
                          </Button>
                        )}
                        {center.directions_url && (
                          <Button asChild variant="outline" size="sm">
                            <a href={center.directions_url} target="_blank" rel="noopener noreferrer">
                              <MapPin className="mr-1 h-3 w-3" />
                              Directions
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3: National Crisis Hotlines & Resources - Always Show */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            ☎️ National Crisis Hotlines & Resources
          </CardTitle>
          <CardDescription>
            {data ? `Available 24/7 in ${data.countryCode === "CA" ? "Canada" : "the United States"}` : "Available 24/7"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data?.hotlines && data.hotlines.length > 0 ? (
              data.hotlines.map((hotline, idx) => (
                <Card key={idx} className="border-primary/20">
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <h4 className="font-semibold leading-tight">
                        {hotline.label}
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-xs">24/7</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {hotline.call && (
                          <Button asChild variant="default" size="sm">
                            <a href={`tel:${hotline.call}`}>
                              <Phone className="mr-1 h-3 w-3" />
                              {hotline.call}
                            </a>
                          </Button>
                        )}
                        {hotline.url && (
                          <Button asChild variant="outline" size="sm">
                            <a href={hotline.url} target="_blank" rel="noopener noreferrer">
                              <Globe className="mr-1 h-3 w-3" />
                              Website
                            </a>
                          </Button>
                        )}
                      </div>
                      {hotline.text && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {hotline.text}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              // Fallback national resources
              <Card className="border-primary/20">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <h4 className="font-semibold leading-tight">
                      988 Suicide & Crisis Lifeline
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-xs">24/7</Badge>
                      <Badge variant="outline" className="text-xs">Multilingual</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button asChild variant="default" size="sm">
                        <a href="tel:988">
                          <Phone className="mr-1 h-3 w-3" />
                          Call 988
                        </a>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <a href="https://988lifeline.org" target="_blank" rel="noopener noreferrer">
                          <Globe className="mr-1 h-3 w-3" />
                          Website
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
