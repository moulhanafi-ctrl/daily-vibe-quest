import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, MapPin, Phone, Globe } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpLocationCard } from "./HelpLocationCard";
import { ZipCodeModal } from "./ZipCodeModal";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";

interface LocalHelpProps {
  embedded?: boolean;
  ageGroup?: string;
}

export const LocalHelp = ({ embedded = false, ageGroup }: LocalHelpProps) => {
  const [zipModalOpen, setZipModalOpen] = useState(false);
  const [userZip, setUserZip] = useState<string | null>(null);
  const [crisisLocations, setCrisisLocations] = useState<any[]>([]);
  const [therapyLocations, setTherapyLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadUserZip();
  }, []);

  useEffect(() => {
    if (userZip) {
      loadLocations();
    }
  }, [userZip]);

  const loadUserZip = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("location")
      .eq("id", user.id)
      .single();

    if (profile?.location && typeof profile.location === 'object' && 'zip' in profile.location) {
      setUserZip(profile.location.zip as string);
    }
  };

  const loadLocations = async () => {
    setLoading(true);
    try {
      // Load crisis resources (prioritize local then national)
      const { data: crisis, error: crisisError } = await supabase
        .from("help_locations")
        .select("*")
        .eq("type", "crisis")
        .eq("is_active", true)
        .or(`is_national.eq.true,zip_coverage.cs.{${userZip}}`)
        .order("priority", { ascending: false })
        .limit(5);

      if (crisisError) {
        console.error("Error loading crisis locations:", crisisError);
      }

      // Load therapy providers
      const { data: therapy, error: therapyError } = await supabase
        .from("help_locations")
        .select("*")
        .eq("type", "therapy")
        .eq("is_active", true)
        .contains("zip_coverage", [userZip])
        .order("priority", { ascending: false })
        .limit(5);

      if (therapyError) {
        console.error("Error loading therapy locations:", therapyError);
      }

      setCrisisLocations(crisis || []);
      setTherapyLocations(therapy || []);

      trackEvent({ eventType: "help_viewed", metadata: { zip: userZip } });
    } catch (error) {
      console.error("Error loading locations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleZipSaved = (zip: string) => {
    setUserZip(zip);
  };

  if (!userZip && !embedded) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center space-y-4">
          <MapPin className="h-12 w-12 text-primary mx-auto" />
          <h2 className="text-2xl font-bold">Find Local Help</h2>
          <p className="text-muted-foreground">
            Get connected to crisis resources and therapy providers near you
          </p>
          <Button onClick={() => setZipModalOpen(true)} size="lg">
            Enter ZIP Code
          </Button>
        </div>
        <ZipCodeModal
          open={zipModalOpen}
          onOpenChange={setZipModalOpen}
          onZipSaved={handleZipSaved}
        />
      </div>
    );
  }

  const nationalResources = [
    {
      id: "988",
      name: "988 Suicide & Crisis Lifeline",
      phone: "988",
      website_url: "https://988lifeline.org",
      tags: ["24/7", "Multilingual", "Crisis Support"],
      type: "crisis" as const,
    },
    {
      id: "crisis-text",
      name: "Crisis Text Line",
      phone: "741741",
      website_url: "https://www.crisistextline.org",
      tags: ["24/7", "Text Support", "Anonymous"],
      type: "crisis" as const,
    },
    {
      id: "trevor",
      name: "The Trevor Project",
      phone: "1-866-488-7386",
      website_url: "https://www.thetrevorproject.org",
      tags: ["24/7", "LGBTQ+ Youth", "Crisis Support"],
      type: "crisis" as const,
    },
  ];

  return (
    <div className={embedded ? "space-y-8" : "container mx-auto px-4 py-8 max-w-6xl space-y-8"}>
      <Alert className="border-destructive/20 bg-destructive/5">
        <AlertCircle className="h-4 w-4 text-destructive" />
        <AlertDescription>
          <strong>Emergency?</strong> If you're in immediate danger, call 911 or your local emergency services.
          Vibe Check isn't therapy and can't provide emergency care.
        </AlertDescription>
      </Alert>

      {!embedded && userZip && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Local Help</h1>
            <p className="text-muted-foreground">
              Crisis resources and therapy providers near {userZip}
            </p>
          </div>
          <Button variant="outline" onClick={() => setZipModalOpen(true)}>
            <MapPin className="h-4 w-4 mr-2" />
            Change ZIP
          </Button>
        </div>
      )}

      {/* Section 1: Therapists Near Me */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
            🩺 Therapists Near Me
          </h2>
          <p className="text-muted-foreground text-sm">
            Licensed mental health professionals in your area
          </p>
        </div>
        {loading ? (
          <p className="text-muted-foreground">Loading therapists...</p>
        ) : therapyLocations.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground mb-4">
                No local therapists found for ZIP {userZip}. Try a nearby ZIP or explore telehealth options.
              </p>
              <Button variant="outline" onClick={() => setZipModalOpen(true)}>
                Try Different ZIP Code
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {therapyLocations.slice(0, 3).map((location) => (
              <HelpLocationCard key={location.id} location={location} ageGroup={ageGroup} />
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Crisis Centers Near Me */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
            🚨 Crisis Centers Near Me
          </h2>
          <p className="text-muted-foreground text-sm">
            Local crisis intervention services within 25 miles
          </p>
        </div>
        {loading ? (
          <p className="text-muted-foreground">Loading crisis centers...</p>
        ) : crisisLocations.filter(loc => !loc.is_national).length === 0 ? (
          <Alert className="border-destructive/50">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <AlertDescription>
              <strong>No local crisis centers found.</strong> Please use our national crisis resources below or dial 988 for immediate support.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {crisisLocations
              .filter(loc => !loc.is_national)
              .slice(0, 3)
              .map((location) => (
                <HelpLocationCard key={location.id} location={location} ageGroup={ageGroup} />
              ))}
          </div>
        )}
      </div>

      {/* Section 3: National Crisis Hotlines & Resources */}
      <div className="space-y-4 bg-primary/5 p-6 rounded-lg border border-primary/20">
        <div>
          <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
            ☎️ National Crisis Hotlines & Resources
          </h2>
          <p className="text-muted-foreground text-sm">
            Available 24/7 nationwide - immediate support when you need it most
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {nationalResources.map((resource) => (
            <Card key={resource.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">{resource.name}</CardTitle>
                <CardDescription className="flex flex-wrap gap-2">
                  {resource.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                    >
                      {tag}
                    </span>
                  ))}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="default"
                  className="w-full"
                  onClick={() => {
                    window.location.href = `tel:${resource.phone}`;
                    trackEvent({ eventType: "help_call", metadata: { resource: resource.name } });
                  }}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call {resource.phone}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    window.open(resource.website_url, "_blank");
                    trackEvent({ eventType: "help_website", metadata: { resource: resource.name } });
                  }}
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Visit Website
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {(therapyLocations.length > 3 || crisisLocations.length > 3) && !embedded && (
        <div className="text-center">
          <Button onClick={() => navigate("/help/nearby")} size="lg">
            View More Resources & Filter Results
          </Button>
        </div>
      )}

      <ZipCodeModal
        open={zipModalOpen}
        onOpenChange={setZipModalOpen}
        onZipSaved={handleZipSaved}
      />
    </div>
  );
};
