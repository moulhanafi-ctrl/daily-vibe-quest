import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Search, 
  Star, 
  AlertCircle, 
  Clock, 
  Phone,
  ExternalLink,
  Navigation,
  Shield,
  Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";

interface HelpLocation {
  id: string;
  type: "crisis" | "therapy";
  name: string;
  phone?: string;
  website_url?: string;
  address: string;
  open_now?: boolean;
  accepts_insurance?: boolean;
  insurers?: string[];
  sliding_scale?: boolean;
  telehealth?: boolean;
  tags?: string[];
  ratings?: any;
  is_national?: boolean;
  open_hours?: any;
}

export const LocalHelpSearch = () => {
  const [zipCode, setZipCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [crisisCenters, setCrisisCenters] = useState<HelpLocation[]>([]);
  const [topRated, setTopRated] = useState<HelpLocation[]>([]);
  const [openNow, setOpenNow] = useState<HelpLocation[]>([]);
  const [allLocations, setAllLocations] = useState<HelpLocation[]>([]);
  
  const isValidZip = /^\d{5}$/.test(zipCode);

  const handleSearch = async () => {
    if (!isValidZip) {
      toast.error("Please enter a valid 5-digit ZIP code");
      return;
    }

    setSearching(true);
    
    try {
      // Fetch local resources for this ZIP
      const { data, error } = await supabase
        .from("help_locations")
        .select("*")
        .contains("zip_coverage", [zipCode]);

      if (error) throw error;

      const locations = (data || []).map((loc: any) => ({
        ...loc,
        ratings: loc.ratings && typeof loc.ratings === 'object' ? loc.ratings : undefined
      }));

      // Separate crisis centers (24/7 lines)
      const crisis = locations.filter((loc: any) => 
        loc.type === "crisis" && loc.tags?.includes("24/7")
      );

      // Get top 3 rated therapy facilities
      const therapyLocations = locations
        .filter((loc: any) => loc.type === "therapy" && loc.ratings)
        .sort((a: any, b: any) => {
          const ratingA = a.ratings?.avg || 0;
          const ratingB = b.ratings?.avg || 0;
          return ratingB - ratingA;
        })
        .slice(0, 3);

      // Get currently open facilities
      const openLocations = locations.filter((loc: any) => loc.open_now === true);

      setCrisisCenters(crisis);
      setTopRated(therapyLocations);
      setOpenNow(openLocations);
      setAllLocations(locations);

      trackEvent({
        eventType: "help_website_clicked",
        metadata: { zipCode, resultsCount: locations.length }
      });

      // Save to profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ location: { zip: zipCode, consented: true } })
          .eq("id", user.id);
      }

    } catch (error) {
      console.error("Error searching:", error);
      toast.error("Error searching for help locations");
    } finally {
      setSearching(false);
    }
  };

  const handleCall = (location: HelpLocation) => {
    trackEvent({
      eventType: "help_call_clicked",
      metadata: { id: location.id, type: location.type, zipCode }
    });
    if (location.phone) {
      window.location.href = `tel:${location.phone}`;
    }
  };

  const handleWebsite = (location: HelpLocation) => {
    trackEvent({
      eventType: "help_website_clicked",
      metadata: { id: location.id, type: location.type, zipCode }
    });
    if (location.website_url) {
      window.open(location.website_url, "_blank");
    }
  };

  const handleDirections = (location: HelpLocation) => {
    trackEvent({
      eventType: "help_directions_clicked",
      metadata: { id: location.id, type: location.type, zipCode }
    });
    const query = encodeURIComponent(location.address);
    window.open(`https://maps.google.com/?q=${query}`, "_blank");
  };

  const LocationCard = ({ location, featured = false }: { location: HelpLocation; featured?: boolean }) => (
    <Card className={featured ? "border-primary shadow-lg" : "hover:shadow-md transition-shadow"}>
      <CardContent className="p-4 space-y-3">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-lg">{location.name}</h3>
            <div className="flex gap-1 shrink-0">
              {location.type === "crisis" && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Crisis
                </Badge>
              )}
              {featured && (
                <Badge variant="default" className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Top Rated
                </Badge>
              )}
            </div>
          </div>
          
          {location.ratings && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-yellow-600">
                <Star className="h-4 w-4 fill-current" />
                <span className="font-semibold">{location.ratings.avg.toFixed(1)}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                ({location.ratings.count} reviews)
              </span>
            </div>
          )}
          
          <p className="text-sm text-muted-foreground">{location.address}</p>

          {location.type === "crisis" && location.tags?.includes("24/7") && (
            <div className="flex items-center gap-1 text-sm">
              <Clock className="h-3 w-3 text-green-600" />
              <span className="text-green-600 font-medium">
                Open now • 24/7
              </span>
            </div>
          )}

          {location.open_now && (
            <div className="flex items-center gap-1 text-sm">
              <Clock className="h-3 w-3 text-green-600" />
              <span className="text-green-600">Open now</span>
            </div>
          )}
        </div>

        {location.tags && location.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {location.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        )}

        {location.type === "therapy" && (
          <div className="text-xs text-muted-foreground space-y-1">
            {location.sliding_scale && <p>• Sliding scale fees available</p>}
            {location.telehealth && <p>• Telehealth available</p>}
            {location.accepts_insurance && location.insurers && location.insurers.length > 0 && (
              <p>• Accepts: {location.insurers.slice(0, 3).join(", ")}</p>
            )}
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {location.phone && (
            <Button
              onClick={() => handleCall(location)}
              size="sm"
              variant={location.type === "crisis" ? "default" : "outline"}
              className="flex-1"
            >
              <Phone className="h-4 w-4 mr-1" />
              Call
            </Button>
          )}
          {location.website_url && (
            <Button
              onClick={() => handleWebsite(location)}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Website
            </Button>
          )}
          {!location.is_national && (
            <Button 
              onClick={() => handleDirections(location)} 
              size="sm" 
              variant="outline"
            >
              <Navigation className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Find Local Help
          </CardTitle>
          <CardDescription>
            Enter your ZIP code to find crisis centers and top-rated therapy facilities near you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter ZIP code (e.g., 10001)"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                maxLength={5}
                className="pl-10"
              />
            </div>
            <Button 
              onClick={handleSearch} 
              disabled={!isValidZip || searching}
              size="lg"
            >
              <Search className="h-4 w-4 mr-2" />
              {searching ? "Searching..." : "Search"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Crisis Centers Section */}
      {crisisCenters.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <h2 className="text-2xl font-bold">24/7 Crisis Centers</h2>
            <Badge variant="destructive">Available Now</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {crisisCenters.map((location) => (
              <LocationCard key={location.id} location={location} />
            ))}
          </div>
        </div>
      )}

      {/* Top 3 Rated Facilities */}
      {topRated.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-600 fill-current" />
            <h2 className="text-2xl font-bold">Top Rated Facilities Near {zipCode}</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {topRated.map((location, idx) => (
              <LocationCard key={location.id} location={location} featured />
            ))}
          </div>
        </div>
      )}

      {/* Open Now Section */}
      {openNow.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-green-600" />
            <h2 className="text-2xl font-bold">Open Now</h2>
            <Badge variant="outline" className="text-green-600 border-green-600">
              {openNow.length} locations
            </Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {openNow
              .filter((loc) => !topRated.find((t) => t.id === loc.id))
              .map((location) => (
                <LocationCard key={location.id} location={location} />
              ))}
          </div>
        </div>
      )}

      {/* All Locations */}
      {allLocations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">All Local Resources ({allLocations.length})</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {allLocations
              .filter((loc) => 
                !crisisCenters.find((c) => c.id === loc.id) &&
                !topRated.find((t) => t.id === loc.id) &&
                !openNow.find((o) => o.id === loc.id)
              )
              .map((location) => (
                <LocationCard key={location.id} location={location} />
              ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {zipCode.length === 5 && !searching && allLocations.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center space-y-2">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-semibold">No locations found</h3>
            <p className="text-muted-foreground">
              We couldn't find any help locations for ZIP code {zipCode}.
              Try a nearby ZIP code or contact national hotlines.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
