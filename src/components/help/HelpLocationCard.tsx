import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, ExternalLink, Navigation, Flag, Clock } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { useSearchParams } from "react-router-dom";
interface HelpLocation {
  id: string;
  type: "crisis" | "therapy";
  name: string;
  phone?: string;
  website_url?: string;
  address: string;
  distance?: number;
  open_now?: boolean;
  accepts_insurance?: boolean;
  insurers?: string[];
  sliding_scale?: boolean;
  telehealth?: boolean;
  tags?: string[];
  ratings?: { avg: number; count: number };
  is_national?: boolean;
}

interface HelpLocationCardProps {
  location: HelpLocation;
  ageGroup?: string;
}

const tagLabels: Record<string, string> = {
  "lgbtq_affirming": "LGBTQ+ Affirming",
  "bilingual": "Bilingual",
  "accessible": "Accessible",
  "youth_friendly": "Youth Friendly",
  "24/7": "24/7",
  "multilingual": "Multilingual",
  "text_based": "Text Support"
};

export const HelpLocationCard = ({ location, ageGroup }: HelpLocationCardProps) => {
  const isMinor = ageGroup === "child" || ageGroup === "teen";
  const [searchParams] = useSearchParams();
  const zip = searchParams.get("zip") || undefined;
  const radiusParam = searchParams.get("radius");
  const radius = radiusParam ? parseInt(radiusParam) : undefined;

  const ensureHttps = (url: string) => {
    const trimmed = url.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      return `https://${trimmed}`;
    }
    return trimmed.replace(/^http:\/\//i, "https://");
  };

  const sanitizePhone = (phone?: string) => {
    return phone ? phone.replace(/[^\d+]/g, "") : "";
  };

  const isValidPhone = (phone?: string) => {
    const s = sanitizePhone(phone);
    return s.length >= 7;
  };

  const formatPhone = (phone?: string) => {
    if (!phone) return "";
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
  };

  const handleCall = () => {
    trackEvent({
      eventType: "therapist_phone_clicked",
      metadata: { id: location.id, type: location.type, name: location.name, zip, radius },
    });
    if (isValidPhone(location.phone)) {
      window.location.href = `tel:${sanitizePhone(location.phone)}`;
    }
  };

  const handleWebsite = () => {
    console.log("HelpLocationCard - handleWebsite clicked for:", location.name, "URL:", location.website_url);
    trackEvent({
      eventType: "therapist_website_clicked",
      metadata: { id: location.id, type: location.type, name: location.name, zip, radius },
    });
    if (location.website_url) {
      const url = ensureHttps(location.website_url);
      console.log("Opening URL:", url);
      const opened = window.open(url, "_blank");
      console.log("window.open result:", opened);
      if (!opened) {
        console.log("Popup was blocked");
      }
    }
  };

  const handleDirections = () => {
    trackEvent({
      eventType: "therapist_directions_clicked",
      metadata: { id: location.id, type: location.type, name: location.name, zip, radius },
    });
    if (location.address) {
      const query = encodeURIComponent(location.address);
      window.open(`https://maps.google.com/?q=${query}`, "_blank");
    }
  };

  const cardClass = location.website_url 
    ? "hover:shadow-lg transition-all cursor-pointer hover:border-primary/50" 
    : "hover:shadow-md transition-shadow";

  const handleCardClick = () => {
    if (location.website_url) {
      handleWebsite();
    }
  };

  return (
    <Card className={cardClass} onClick={handleCardClick}>
      <CardContent className="p-4 space-y-3">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-lg">{location.name}</h3>
            {location.type === "crisis" && (
              <Badge variant="destructive" className="shrink-0">Crisis</Badge>
            )}
          </div>
          
          {location.address && (
            <div className="text-sm text-muted-foreground flex items-start gap-1.5">
              <span aria-hidden>📍</span>
              <span>{location.address}</span>
            </div>
          )}

          {isValidPhone(location.phone) && (
            <div className="text-sm text-foreground font-medium flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              <a 
                href={`tel:${sanitizePhone(location.phone)}`}
                className="hover:text-primary transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCall();
                }}
                aria-label={`Call ${location.name}`}
              >
                {formatPhone(location.phone)}
              </a>
            </div>
          )}
          
          {location.distance !== undefined && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Navigation className="h-3 w-3" />
              {location.distance.toFixed(1)} miles away
            </p>
          )}

          {location.open_now !== undefined && (
            <div className="flex items-center gap-1 text-sm">
              <Clock className="h-3 w-3" />
              <span className={location.open_now ? "text-green-600" : "text-orange-600"}>
                {location.open_now ? "Open now" : "Closed"}
              </span>
            </div>
          )}
          
          {/* 24/7 crisis lines always show as open */}
          {location.type === "crisis" && location.tags?.includes("24/7") && (
            <div className="flex items-center gap-1 text-sm">
              <Clock className="h-3 w-3" />
              <span className="text-green-600 font-medium">
                Open now • 24/7
              </span>
            </div>
          )}
        </div>

        {location.tags && location.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {location.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tagLabels[tag] || tag}
              </Badge>
            ))}
          </div>
        )}

        {location.type === "therapy" && (
          <div className="text-xs text-muted-foreground space-y-1">
            {location.accepts_insurance && location.insurers && location.insurers.length > 0 && (
              <p>Insurance: {location.insurers.slice(0, 3).join(", ")}{location.insurers.length > 3 ? "..." : ""}</p>
            )}
            {location.sliding_scale && <p>• Sliding scale fees available</p>}
            {location.telehealth && <p>• Telehealth available</p>}
            {location.ratings && (
              <p>⭐ {location.ratings.avg.toFixed(1)} ({location.ratings.count} reviews)</p>
            )}
          </div>
        )}

        {isMinor && location.type === "therapy" && (
          <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
            💬 Talk with a parent or guardian to book an appointment
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-2" onClick={(e) => e.stopPropagation()}>
          {isValidPhone(location.phone) ? (
            <Button
              asChild
              onClick={handleCall}
              size="sm"
              variant={location.type === "crisis" ? "default" : "outline"}
              className="flex-1"
            >
              <a
                href={`tel:${sanitizePhone(location.phone!)}`}
                aria-label={`Call ${location.name}`}
              >
                <Phone className="h-4 w-4 mr-2" />
                Call
              </a>
            </Button>
          ) : (
            <Button
              disabled
              size="sm"
              variant="outline"
              className="flex-1"
              aria-label="No phone available"
            >
              <Phone className="h-4 w-4 mr-2" />
              No Phone
            </Button>
          )}
          
          {location.address ? (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="flex-1 cursor-pointer"
              aria-label={`Get directions to ${location.name}`}
            >
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => { e.stopPropagation(); handleDirections(); }}
              >
                <Navigation className="h-4 w-4 mr-2" />
                Directions
              </a>
            </Button>
          ) : (
            <Button
              disabled
              size="sm"
              variant="outline"
              className="flex-1"
              aria-label="No address available"
            >
              <Navigation className="h-4 w-4 mr-2" />
              No Address
            </Button>
          )}

          {location.website_url ? (
            <Button
              asChild
              size="sm"
              variant={location.type === "therapy" ? "default" : "outline"}
              className="flex-1 sm:flex-[1.2] cursor-pointer"
              aria-label={`Visit ${location.name} website`}
            >
              <a
                href={ensureHttps(location.website_url!)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => { e.stopPropagation(); handleWebsite(); }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Website
              </a>
            </Button>
          ) : (
            <Button
              disabled
              size="sm"
              variant="outline"
              className="flex-1 sm:flex-[1.2]"
              aria-label="No website available"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              No Website
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
