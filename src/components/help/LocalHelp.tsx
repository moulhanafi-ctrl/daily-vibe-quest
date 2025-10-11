import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, MapPin } from "lucide-react";
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
      // Load crisis resources (prioritize national + local)
      const { data: crisis } = await supabase
        .from("help_locations")
        .select("*")
        .eq("type", "crisis")
        .or(`is_national.eq.true,zip_coverage.cs.{${userZip}}`)
        .order("priority", { ascending: false })
        .limit(3);

      // Load therapy providers
      const { data: therapy } = await supabase
        .from("help_locations")
        .select("*")
        .eq("type", "therapy")
        .contains("zip_coverage", [userZip])
        .order("priority", { ascending: false })
        .limit(3);

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

  return (
    <div className={embedded ? "space-y-6" : "container mx-auto px-4 py-8 max-w-6xl space-y-6"}>
      <Alert className="border-destructive/20 bg-destructive/5">
        <AlertCircle className="h-4 w-4 text-destructive" />
        <AlertDescription>
          <strong>Emergency?</strong> If you're in immediate danger, call 911 or your local emergency services.
          Vibe Check isn't therapy and can't provide emergency care.
        </AlertDescription>
      </Alert>

      {!embedded && (
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

      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-destructive">Crisis Now</span>
            {crisisLocations.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                (Top {crisisLocations.length})
              </span>
            )}
          </h2>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : crisisLocations.length === 0 ? (
            <p className="text-muted-foreground">No crisis resources found. Showing national resources.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {crisisLocations.map((location) => (
                <HelpLocationCard key={location.id} location={location} ageGroup={ageGroup} />
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            Therapy Near You
            {therapyLocations.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                (Top {therapyLocations.length})
              </span>
            )}
          </h2>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : therapyLocations.length === 0 ? (
            <p className="text-muted-foreground">
              No therapy providers found in your area. Try expanding your search or checking telehealth options.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {therapyLocations.map((location) => (
                <HelpLocationCard key={location.id} location={location} ageGroup={ageGroup} />
              ))}
            </div>
          )}
        </div>

        {(crisisLocations.length > 0 || therapyLocations.length > 0) && (
          <div className="text-center">
            <Button onClick={() => navigate("/help/nearby")} variant="outline" size="lg">
              See More & Filter Results
            </Button>
          </div>
        )}
      </div>

      <ZipCodeModal
        open={zipModalOpen}
        onOpenChange={setZipModalOpen}
        onZipSaved={handleZipSaved}
      />
    </div>
  );
};
