import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Phone, Globe, Navigation, AlertCircle, MapPin, Clock, ExternalLink } from "lucide-react";
import { CrisisBanner } from "@/components/help/CrisisBanner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";

interface HelpLocation {
  id: string;
  type: "crisis" | "therapy";
  name: string;
  phone?: string;
  website_url?: string;
  address: string;
  distance?: number;
  tags?: string[];
  accepts_insurance?: boolean;
  sliding_scale?: boolean;
  telehealth?: boolean;
}

interface NationalHotline {
  id: string;
  name: string;
  phone?: string;
  website_url?: string;
  tags?: string[];
}

const tagLabels: Record<string, string> = {
  "lgbtq_affirming": "LGBTQ+ Affirming",
  "bilingual": "Bilingual",
  "24/7": "24/7",
  "multilingual": "Multilingual",
  "text_based": "Text Support",
  "youth_friendly": "Youth Friendly"
};

export default function HelpResources() {
  const navigate = useNavigate();
  const [zipCode, setZipCode] = useState("");
  const [location, setLocation] = useState<{ city?: string; state?: string } | null>(null);
  const [therapists, setTherapists] = useState<HelpLocation[]>([]);
  const [crisisCenters, setCrisisCenters] = useState<HelpLocation[]>([]);
  const [nationalHotlines, setNationalHotlines] = useState<NationalHotline[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    loadUserZip();
    loadNationalHotlines();
  }, []);

  const loadUserZip = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("location, zipcode")
      .eq("id", user.id)
      .single();

    if (profile?.location && typeof profile.location === 'object' && 'zip' in profile.location) {
      const savedZip = profile.location.zip as string;
      setZipCode(savedZip);
      handleSearch(savedZip);
    } else if (profile?.zipcode) {
      setZipCode(profile.zipcode);
      handleSearch(profile.zipcode);
    }
  };

  const loadNationalHotlines = async () => {
    try {
      const { data, error } = await supabase
        .from("help_locations")
        .select("*")
        .eq("is_national", true)
        .order("priority", { ascending: false });

      if (error) throw error;
      setNationalHotlines(data || []);
    } catch (error) {
      console.error("Error loading national hotlines:", error);
    }
  };

  const handleSearch = async (searchZip?: string) => {
    const zip = searchZip || zipCode;
    if (!zip || !/^\d{5}$/.test(zip)) {
      toast.error("Please enter a valid 5-digit ZIP code");
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to search for local resources");
        return;
      }

      const response = await supabase.functions.invoke("geocode-zip", {
        body: { zip_code: zip },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw response.error;

      const { data } = response;
      
      if (data?.ok) {
        setLocation({ city: data.city, state: data.state });
        setTherapists(data.resources?.therapists || []);
        setCrisisCenters(data.resources?.crisis_centers || []);
        toast.success(`Found resources near ${data.city}, ${data.state}`);
        
        trackEvent({
          eventType: "help_viewed",
          metadata: { zip, city: data.city, state: data.state },
        });
      } else {
        toast.error(data?.error || "Invalid ZIP code");
      }
    } catch (error) {
      console.error("Error searching:", error);
      toast.error("Failed to search. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCall = (location: HelpLocation | NationalHotline, isNational = false) => {
    if (location.phone) {
      window.location.href = `tel:${location.phone}`;
      trackEvent({
        eventType: "help_call_clicked",
        metadata: { 
          id: location.id,
          is_national: isNational
        },
      });
    }
  };

  const handleWebsite = (location: HelpLocation | NationalHotline, isNational = false) => {
    if (location.website_url) {
      window.open(location.website_url, "_blank");
      trackEvent({
        eventType: "help_website_clicked",
        metadata: { 
          id: location.id,
          is_national: isNational
        },
      });
    }
  };

  const handleDirections = (location: HelpLocation) => {
    if (location.address) {
      const query = encodeURIComponent(location.address);
      window.open(`https://maps.google.com/?q=${query}`, "_blank");
      trackEvent({
        eventType: "help_directions_clicked",
        metadata: { id: location.id },
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <CrisisBanner />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
            ← Back
          </Button>
          <h1 className="text-3xl font-bold">Help & Resources</h1>
          <p className="text-muted-foreground mt-2">
            Find local therapists, crisis centers, and national support resources
          </p>
        </div>

        {/* ZIP Search */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Find Local Resources
            </CardTitle>
            <CardDescription>
              Enter your ZIP code to find licensed therapists and crisis centers near you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter ZIP code"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                maxLength={5}
                className="max-w-xs"
              />
              <Button onClick={() => handleSearch()} disabled={isLoading}>
                {isLoading ? "Searching..." : "Search"}
              </Button>
            </div>
            {location && (
              <p className="text-sm text-muted-foreground mt-2">
                Showing results for {location.city}, {location.state}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Therapists Near Me */}
        {hasSearched && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">
              Therapists Near Me
              {therapists.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  (Top 3 within 15 miles)
                </span>
              )}
            </h2>
            {therapists.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No therapists found in your area. Try expanding your search or check our national resources below.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {therapists.map((therapist) => (
                  <Card key={therapist.id} className="flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-lg">{therapist.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {therapist.address}
                      </CardDescription>
                      {therapist.distance && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Navigation className="h-3 w-3" />
                          {therapist.distance.toFixed(1)} miles away
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-between gap-4">
                      <div className="space-y-2">
                        {therapist.tags && therapist.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {therapist.tags.map((tag, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {tagLabels[tag] || tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground space-y-1">
                          {therapist.accepts_insurance && <p>• Insurance accepted</p>}
                          {therapist.sliding_scale && <p>• Sliding scale fees available</p>}
                          {therapist.telehealth && <p>• Telehealth available</p>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {therapist.website_url && (
                          <Button 
                            onClick={() => handleWebsite(therapist)}
                            className="w-full"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Profile
                          </Button>
                        )}
                        <div className="flex gap-2">
                          {therapist.phone && (
                            <Button 
                              onClick={() => handleCall(therapist)}
                              variant="outline"
                              className="flex-1"
                            >
                              <Phone className="h-4 w-4 mr-2" />
                              Call
                            </Button>
                          )}
                          <Button 
                            onClick={() => handleDirections(therapist)}
                            variant="outline"
                            className="flex-1"
                          >
                            <Navigation className="h-4 w-4 mr-2" />
                            Directions
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Crisis Centers Near Me */}
        {hasSearched && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-destructive">
              Crisis Centers Near Me
              {crisisCenters.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  (Top 3 closest centers)
                </span>
              )}
            </h2>
            {crisisCenters.length === 0 ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No local crisis centers found. Please use our national crisis resources below or call 911 in an emergency.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {crisisCenters.map((center) => (
                  <Card key={center.id} className="flex flex-col border-destructive/20">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg">{center.name}</CardTitle>
                        <Badge variant="destructive" className="shrink-0">
                          Crisis
                        </Badge>
                      </div>
                      <CardDescription className="text-sm">
                        {center.address}
                      </CardDescription>
                      {center.distance && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Navigation className="h-3 w-3" />
                          {center.distance.toFixed(1)} miles away
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-between gap-4">
                      <div className="space-y-2">
                        {center.tags?.includes("24/7") && (
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3" />
                            <span className="text-green-600 font-medium">Open 24/7</span>
                          </div>
                        )}
                        {center.tags && center.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {center.tags.map((tag, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {tagLabels[tag] || tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        {center.phone && (
                          <Button 
                            onClick={() => handleCall(center)}
                            className="w-full"
                            size="lg"
                          >
                            <Phone className="h-4 w-4 mr-2" />
                            Call Now
                          </Button>
                        )}
                        <div className="flex gap-2">
                          {center.website_url && (
                            <Button 
                              onClick={() => handleWebsite(center)}
                              variant="outline"
                              className="flex-1"
                            >
                              <Globe className="h-4 w-4 mr-2" />
                              Website
                            </Button>
                          )}
                          <Button 
                            onClick={() => handleDirections(center)}
                            variant="outline"
                            className="flex-1"
                          >
                            <Navigation className="h-4 w-4 mr-2" />
                            Directions
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}

        {/* National Help & Resources */}
        <section>
          <h2 className="text-2xl font-bold mb-4">National Help & Resources</h2>
          <p className="text-muted-foreground mb-4">
            24/7 crisis support and mental health resources available nationwide
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {nationalHotlines.map((hotline) => (
              <Card key={hotline.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">{hotline.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">24/7 Available</span>
                    </div>
                    {hotline.tags && hotline.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {hotline.tags.map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {tagLabels[tag] || tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {hotline.phone && (
                      <Button 
                        onClick={() => handleCall(hotline, true)}
                        className="w-full"
                        size="lg"
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Call {hotline.phone}
                      </Button>
                    )}
                    {hotline.website_url && (
                      <Button 
                        onClick={() => handleWebsite(hotline, true)}
                        variant="outline"
                        className="w-full"
                      >
                        <Globe className="h-4 w-4 mr-2" />
                        Visit Website
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
