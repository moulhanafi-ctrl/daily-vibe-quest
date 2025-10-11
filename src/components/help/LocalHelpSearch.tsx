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
  id: string;
  name: string;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  distance?: number | null;
  verified?: boolean;
  accepts_insurance?: boolean;
  sliding_scale?: boolean;
  telehealth?: boolean;
  rating?: number;
  open_now?: boolean;
}

interface NationalResource {
  id: string;
  name: string;
  phone?: string | null;
  text?: string | null;
  website?: string | null;
  tags?: string[] | null;
}

interface LocalHelpResponse {
  ok: boolean;
  zip: string;
  city: string;
  state: string;
  radius: number;
  crisis_centers: LocalHelpLocation[];
  therapists: LocalHelpLocation[];
  error?: string;
}

function normalizeZip(input: string): string {
  const digits = (input || "").replace(/\D/g, "");
  return digits.slice(0, 5);
}

export const LocalHelpSearch = () => {
  const [zip, setZip] = useState("");
  const [radius, setRadius] = useState<number>(25);
  const [loading, setLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LocalHelpResponse | null>(null);
  const [nationalResources, setNationalResources] = useState<NationalResource[]>([]);
  const { toast } = useToast();

  // Load user's saved ZIP from profile and national resources
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load user ZIP if authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("zipcode")
            .eq("id", user.id)
            .single();
          
          if (profile?.zipcode) {
            const normalized = normalizeZip(profile.zipcode);
            setZip(normalized);
            // Auto-search with saved ZIP
            await performSearch(normalized, radius);
          }
        }

        // Load national resources
        const { data: national, error: nationalError } = await supabase
          .from("help_locations")
          .select("id, name, phone, website_url, tags")
          .eq("is_national", true)
          .eq("is_active", true);

        if (!nationalError && national) {
          setNationalResources(
            national.map((n) => ({
              id: n.id,
              name: n.name,
              phone: n.phone,
              text: null, // SMS numbers would need separate field
              website: n.website_url,
              tags: n.tags,
            }))
          );
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
    const normalized = normalizeZip(zipCode);
    
    if (!/^\d{5}$/.test(normalized)) {
      setError("Please enter a valid 5-digit ZIP code");
      setData(null);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { data: response, error: fnError } = await supabase.functions.invoke<LocalHelpResponse>(
        "local-help",
        {
          body: { zip_code: normalized, radius: searchRadius },
        }
      );

      if (fnError) {
        console.error("Edge function error:", fnError);
        throw new Error("Could not fetch local resources");
      }

      if (!response?.ok) {
        throw new Error(response?.error || "Invalid response from server");
      }

      // Guard against null/undefined payloads
      const payload: LocalHelpResponse = {
        ok: true,
        zip: response.zip,
        city: response.city,
        state: response.state,
        radius: response.radius,
        therapists: response.therapists ?? [],
        crisis_centers: response.crisis_centers ?? [],
      };

      setData(payload);

      // Track successful search
      await trackEvent({
        eventType: "help_local_ranked",
        metadata: {
          zip: normalized,
          radius: searchRadius,
          therapists_count: payload.therapists.length,
          crisis_count: payload.crisis_centers.length,
        },
      });

      toast({
        title: "Location found",
        description: `Showing resources near ${payload.city}, ${payload.state}`,
      });
    } catch (err: any) {
      console.error("Local help search failed:", err);
      const errorMessage = err.message || "We couldn't fetch local results right now. National resources are still available below.";
      setError(errorMessage);
      
      // Track error
      await trackEvent({
        eventType: "help_local_ranked",
        metadata: { zip: normalized, error: errorMessage, success: false },
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
    <div className="space-y-6">
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
                ZIP Code
              </label>
              <Input
                id="zip"
                inputMode="numeric"
                pattern="\d*"
                maxLength={10}
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="e.g., 48917 or 48917-1234"
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
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
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

      {/* Results */}
      {data && (
        <div className="space-y-6">
          {/* Crisis Centers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Crisis Centers Near {data.city}, {data.state}
              </CardTitle>
              <CardDescription>
                Immediate support available 24/7
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.crisis_centers.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No local crisis centers found within {data.radius} miles. National hotlines are available below 24/7.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {data.crisis_centers.map((center) => (
                    <Card key={center.id} className="relative">
                      <CardContent className="pt-6">
                        <div className="space-y-2">
                          <h4 className="font-semibold leading-tight">
                            {center.name}
                          </h4>
                          {center.distance && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Navigation className="h-3 w-3" />
                              ~{center.distance.toFixed(1)} mi away
                            </p>
                          )}
                          {center.verified && (
                            <Badge variant="secondary" className="text-xs">
                              Verified
                            </Badge>
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
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Therapists */}
          <Card>
            <CardHeader>
              <CardTitle>Therapists Near {data.city}, {data.state}</CardTitle>
              <CardDescription>
                Licensed mental health professionals
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.therapists.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No verified therapists found within {data.radius} miles. Try expanding your search radius or check national resources below.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {data.therapists.map((therapist) => (
                    <Card key={therapist.id}>
                      <CardContent className="pt-6">
                        <div className="space-y-2">
                          <h4 className="font-semibold leading-tight">
                            {therapist.name}
                          </h4>
                          {therapist.distance && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Navigation className="h-3 w-3" />
                              ~{therapist.distance.toFixed(1)} mi away
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1">
                            {therapist.verified && (
                              <Badge variant="secondary" className="text-xs">
                                Verified
                              </Badge>
                            )}
                            {therapist.accepts_insurance && (
                              <Badge variant="outline" className="text-xs">
                                Insurance
                              </Badge>
                            )}
                            {therapist.sliding_scale && (
                              <Badge variant="outline" className="text-xs">
                                Sliding Scale
                              </Badge>
                            )}
                            {therapist.telehealth && (
                              <Badge variant="outline" className="text-xs">
                                Telehealth
                              </Badge>
                            )}
                          </div>
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
                                  View
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
        </div>
      )}

      {/* National Resources - Always Show */}
      {nationalResources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>National Help & Resources</CardTitle>
            <CardDescription>
              Available 24/7 anywhere in the United States
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {nationalResources.map((resource) => (
                <Card key={resource.id} className="border-primary/20">
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <h4 className="font-semibold leading-tight">
                        {resource.name}
                      </h4>
                      {resource.tags && resource.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {resource.tags.slice(0, 3).map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 pt-2">
                        {resource.phone && (
                          <Button asChild variant="default" size="sm">
                            <a href={`tel:${resource.phone}`}>
                              <Phone className="mr-1 h-3 w-3" />
                              Call
                            </a>
                          </Button>
                        )}
                        {resource.text && (
                          <Button asChild variant="secondary" size="sm">
                            <a href={`sms:${resource.text}`}>
                              Text
                            </a>
                          </Button>
                        )}
                        {resource.website && (
                          <Button asChild variant="outline" size="sm">
                            <a href={resource.website} target="_blank" rel="noopener noreferrer">
                              <Globe className="mr-1 h-3 w-3" />
                              Website
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
