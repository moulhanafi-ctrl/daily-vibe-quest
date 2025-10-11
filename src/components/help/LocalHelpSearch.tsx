import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Globe, Navigation, Star, Clock, Shield, Heart, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface HelpLocation {
  id: string;
  name: string;
  type: "crisis" | "therapy";
  phone?: string;
  website_url?: string;
  address: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  lat?: number;
  lon?: number;
  latitude?: number;
  longitude?: number;
  open_now?: boolean;
  open_hours?: any;
  ratings?: {
    average?: number;
    count?: number;
  };
  tags?: string[];
  last_verified_at?: string | null;
  verified?: boolean;
  accepts_insurance?: boolean;
  sliding_scale?: boolean;
  telehealth?: boolean;
  is_national?: boolean;
  insurers?: string[];
  distance?: number;
  score?: number;
}

interface UserLocation {
  lat: number;
  lon: number;
}

const isValidZip = /^\d{5}$/;

// Haversine distance calculation
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Calculate location score based on requirements
function calculateScore(
  location: HelpLocation, 
  distance: number,
  maxDistance: number,
  userInsurance?: string
): number {
  const rating = location.ratings?.average || 0;
  const ratingCount = location.ratings?.count || 0;
  const ratingNorm = ratingCount >= 10 ? rating / 5 : 0;
  
  const verified = location.verified ? 1 : 0;
  const openNow = location.open_now || location.type === 'crisis' ? 1 : 0;
  
  let tagMatch = 0;
  const premiumTags = ['youth_friendly', 'lgbtq_affirming', 'bilingual', 'accessible'];
  premiumTags.forEach(tag => {
    if (location.tags?.some(t => t.toLowerCase().includes(tag.toLowerCase()))) {
      tagMatch += 0.03;
    }
  });
  tagMatch = Math.min(tagMatch, 0.10);
  
  const inNetworkMatch = userInsurance && location.insurers?.includes(userInsurance) ? 1 : 0;
  const distanceNorm = distance / maxDistance;
  
  const score = 
    0.45 * ratingNorm +
    0.20 * verified +
    0.10 * openNow +
    0.10 * tagMatch +
    0.10 * inNetworkMatch -
    0.10 * distanceNorm;
    
  return score;
}

export const LocalHelpSearch = () => {
  const [zipCode, setZipCode] = useState("");
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [therapyResults, setTherapyResults] = useState<HelpLocation[]>([]);
  const [crisisResults, setCrisisResults] = useState<HelpLocation[]>([]);
  const [currentRadius, setCurrentRadius] = useState(25);
  const [showExpandOption, setShowExpandOption] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Load user's ZIP and location from profile
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("zipcode, location")
            .eq("id", user.id)
            .single();
          
          if (profile?.zipcode) {
            setZipCode(profile.zipcode);
            if (profile.location && typeof profile.location === 'object' && 'lat' in profile.location && 'lon' in profile.location) {
              const loc = profile.location as { lat: number; lon: number };
              setUserLocation({ 
                lat: loc.lat, 
                lon: loc.lon 
              });
              // Auto-search if we have saved location
              await performSearch({ lat: loc.lat, lon: loc.lon }, profile.zipcode, 25);
            }
          }
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadUserProfile();
  }, []);

  const handleZipChange = async () => {
    if (!isValidZip.test(zipCode)) {
      toast({
        title: "Invalid ZIP code",
        description: "Please enter a valid 5-digit US ZIP code",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      // Call edge function with new format
      const { data, error } = await supabase.functions.invoke('geocode-zip', {
        body: { zip_code: zipCode }
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Failed to validate ZIP code");
      }

      if (!data || !data.ok) {
        throw new Error(data?.error || "Failed to validate ZIP code");
      }

      const { city, state, lat, lon } = data;
      const newLocation = { lat, lon };
      
      setUserLocation(newLocation);
      setCurrentRadius(25);

      // Perform local search
      await performSearch(newLocation, zipCode, 25);

      toast({
        title: "Location updated",
        description: `✅ Now showing resources near ${city}, ${state}`,
      });

      await trackEvent({
        eventType: "help_local_ranked",
        metadata: { zip: zipCode, city, state }
      });
    } catch (error: any) {
      console.error("ZIP update error:", error);
      toast({
        title: "Failed to update ZIP",
        description: error.message || "Could not validate ZIP code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const performSearch = async (location: UserLocation, zip: string, radius: number) => {
    try {
      // Fetch all local (non-national) locations
      const { data: locations, error } = await supabase
        .from("help_locations")
        .select("*")
        .or("is_national.is.null,is_national.eq.false");

      if (error) throw error;

      if (!locations || locations.length === 0) {
        setTherapyResults([]);
        setCrisisResults([]);
        setShowExpandOption(false);
        return;
      }

      // Calculate distances and scores
      const locationsWithDistance: HelpLocation[] = locations
        .map(loc => {
          const locLat = loc.lat || loc.latitude;
          const locLon = loc.lon || loc.longitude;
          if (!locLat || !locLon) return null;
          const distance = calculateDistance(location.lat, location.lon, locLat, locLon);
          if (distance > radius) return null;
          
          const ratings = typeof loc.ratings === 'object' && loc.ratings !== null && !Array.isArray(loc.ratings)
            ? (loc.ratings as { average?: number; count?: number })
            : undefined;
          
          // Derive verified from last_verified_at
          const verified = !!loc.last_verified_at;
          
          // Build address from components
          const address = [loc.address_line1, loc.city, loc.state, loc.postal_code]
            .filter(Boolean)
            .join(", ");
          
          const helpLocation: HelpLocation = {
            id: loc.id,
            name: loc.name,
            type: loc.type,
            phone: loc.phone,
            website_url: loc.website_url,
            address,
            address_line1: loc.address_line1,
            address_line2: loc.address_line2,
            city: loc.city,
            state: loc.state,
            postal_code: loc.postal_code,
            lat: locLat,
            lon: locLon,
            latitude: locLat,
            longitude: locLon,
            open_now: loc.open_now,
            tags: loc.tags,
            last_verified_at: loc.last_verified_at,
            verified,
            accepts_insurance: loc.accepts_insurance,
            sliding_scale: loc.sliding_scale,
            telehealth: loc.telehealth,
            is_national: loc.is_national,
            insurers: loc.insurers,
            ratings,
            distance,
            score: 0 // Calculate below
          };
          
          // Calculate score after object is complete
          helpLocation.score = calculateScore(helpLocation, distance, radius);
          
          return helpLocation;
        })
        .filter((loc): loc is HelpLocation => loc !== null);

      // Separate and rank therapy and crisis
      const therapy = locationsWithDistance
        .filter(l => l.type === "therapy")
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, 3);

      const crisis = locationsWithDistance
        .filter(l => l.type === "crisis")
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, 3);

      setTherapyResults(therapy);
      setCrisisResults(crisis);

      // Show expand option if we have <3 in either category
      const needsExpansion = therapy.length < 3 || crisis.length < 3;
      setShowExpandOption(needsExpansion && radius === 25);

      // Track analytics
      await trackEvent({
        eventType: "help_local_ranked",
        metadata: {
          zip: zip,
          radius: radius,
          therapy_count: therapy.length,
          crisis_count: crisis.length,
        },
      });

    } catch (error: any) {
      console.error("Search error:", error);
      toast({
        title: "Search failed",
        description: error.message || "Failed to search for resources",
        variant: "destructive",
      });
    }
  };

  const handleExpandRadius = async () => {
    if (!userLocation) return;
    
    setCurrentRadius(50);
    setIsSearching(true);
    
    await trackEvent({
      eventType: "help_radius_changed",
      metadata: { from: 25, to: 50 },
    });
    
    await performSearch(userLocation, zipCode, 50);
    setIsSearching(false);
  };

  const handleCall = (location: HelpLocation) => {
    if (location.phone) {
      window.location.href = `tel:${location.phone}`;
      trackEvent({
        eventType: "help_call_clicked",
        metadata: { 
          id: location.id, 
          type: location.type,
          distance: location.distance
        },
      });
    }
  };

  const handleWebsite = (location: HelpLocation) => {
    if (location.website_url) {
      window.open(location.website_url, "_blank");
      trackEvent({
        eventType: "help_website_clicked",
        metadata: { 
          id: location.id, 
          type: location.type,
          distance: location.distance
        },
      });
    }
  };

  const handleDirections = (location: HelpLocation) => {
    const address = encodeURIComponent(location.address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${address}`, "_blank");
    trackEvent({
      eventType: "help_directions_clicked",
      metadata: { 
        id: location.id, 
        type: location.type,
        distance: location.distance
      },
    });
  };

  const LocationCard = ({ location }: { location: HelpLocation }) => (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{location.name}</CardTitle>
          <div className="flex gap-1 shrink-0">
            {location.type === "crisis" && (
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                Crisis
              </Badge>
            )}
            {location.verified && (
              <Badge variant="secondary">
                <Shield className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {location.distance && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {location.distance.toFixed(1)} miles away
          </div>
        )}

        {location.ratings && location.ratings.count && location.ratings.count >= 10 && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">{location.ratings.average?.toFixed(1)}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              ({location.ratings.count} reviews)
            </span>
          </div>
        )}

        <p className="text-sm text-muted-foreground">{location.address}</p>

        {(location.open_now || location.type === 'crisis') && (
          <div className="flex items-center gap-1 text-sm">
            <Clock className="h-3 w-3 text-green-600" />
            <span className="text-green-600 font-medium">Open now</span>
          </div>
        )}

        {location.tags && location.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {location.tags.slice(0, 4).map((tag, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {tag.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        )}

        {location.type === "therapy" && (
          <div className="text-xs text-muted-foreground space-y-1">
            {location.sliding_scale && <p>• Sliding scale fees</p>}
            {location.telehealth && <p>• Telehealth available</p>}
            {location.accepts_insurance && location.insurers && location.insurers.length > 0 && (
              <p>• Accepts: {location.insurers.slice(0, 2).join(", ")}</p>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          {location.phone && (
            <Button
              onClick={() => handleCall(location)}
              className="flex-1"
              size="lg"
            >
              <Phone className="h-4 w-4 mr-2" />
              Call
            </Button>
          )}
          {location.website_url && (
            <Button
              onClick={() => handleWebsite(location)}
              variant="outline"
              className="flex-1"
            >
              <Globe className="h-4 w-4 mr-2" />
              Website
            </Button>
          )}
          <Button 
            onClick={() => handleDirections(location)} 
            variant="outline"
            size="icon"
          >
            <Navigation className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your ZIP Code</CardTitle>
          <CardDescription>
            Change your ZIP code to find local resources near you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter 5-digit ZIP code"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              maxLength={5}
              pattern="[0-9]{5}"
              className="max-w-xs"
            />
            <Button onClick={handleZipChange} disabled={isSearching}>
              {isSearching ? "Updating..." : "Change ZIP"}
            </Button>
          </div>
          {userLocation && (
            <p className="text-sm text-muted-foreground mt-2">
              Showing results within {currentRadius} miles of {zipCode}
            </p>
          )}
        </CardContent>
      </Card>

      {crisisResults.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-destructive" />
            Top 3 Crisis Centers
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {crisisResults.map((location) => (
              <LocationCard
                key={location.id}
                location={location}
              />
            ))}
          </div>
        </div>
      )}

      {therapyResults.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Heart className="h-6 w-6 text-primary" />
            Top 3 Therapy Facilities
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {therapyResults.map((location) => (
              <LocationCard
                key={location.id}
                location={location}
              />
            ))}
          </div>
        </div>
      )}

      {showExpandOption && userLocation && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            We found fewer than 3 local options within 25 miles.
            <div className="flex gap-2 mt-2">
              <Button onClick={handleExpandRadius} variant="outline" size="sm">
                Expand to 50 miles
              </Button>
              <Button onClick={() => navigate('/help/national')} variant="outline" size="sm">
                See national hotlines
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {userLocation && crisisResults.length === 0 && therapyResults.length === 0 && !isSearching && (
        <Card>
          <CardHeader>
            <CardTitle>No Local Results Found</CardTitle>
            <CardDescription>
              We couldn't find any mental health resources within {currentRadius} miles of {zipCode}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {currentRadius === 25 && (
                <Button onClick={handleExpandRadius} variant="outline">
                  Expand to 50 miles
                </Button>
              )}
              <Button onClick={() => navigate('/help/national')} variant="outline">
                See national hotlines
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {userLocation && (
        <div className="flex justify-center">
          <Button 
            onClick={() => navigate('/help/national')} 
            variant="link"
            className="text-sm"
          >
            See national hotlines →
          </Button>
        </div>
      )}
    </div>
  );
};