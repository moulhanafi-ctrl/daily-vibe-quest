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

  const getWebsite = () => {
    const anyLoc: any = location as any;
    const raw = location.website_url || anyLoc.website || anyLoc.url || anyLoc.link || anyLoc.homepage;
    return raw ? ensureHttps(String(raw)) : undefined;
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
    console.log("Clicked phone for", location.name, "Phone:", location.phone);
    trackEvent({
      eventType: "therapist_phone_clicked",
      metadata: { id: location.id, type: location.type, name: location.name, zip, radius },
    });
    if (isValidPhone(location.phone)) {
      window.location.href = `tel:${sanitizePhone(location.phone)}`;
    }
  };

  const handleWebsite = () => {
    console.log("Clicked website for", location.name, "URL:", getWebsite());
    trackEvent({
      eventType: "therapist_website_clicked",
      metadata: { id: location.id, type: location.type, name: location.name, zip, radius },
    });
    const url = getWebsite();
    if (url) {
      console.log("Opening URL:", url);
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      console.log("window.open result:", opened);
      if (!opened) {
        console.log("Popup was blocked");
      }
    }
  };

  const handleDirections = () => {
    console.log("Clicked directions for", location.name, "Address:", location.address);
    trackEvent({
      eventType: "therapist_directions_clicked",
      metadata: { id: location.id, type: location.type, name: location.name, zip, radius },
    });
    if (location.address) {
      const query = encodeURIComponent(location.address);
      window.open(`https://maps.google.com/?q=${query}`, "_blank");
    }
  };

  const cardClass = getWebsite() 
    ? "hover:shadow-lg transition-all cursor-pointer hover:border-primary/50" 
    : "hover:shadow-md transition-shadow";

  const handleCardClick = () => {
    const url = getWebsite();
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Card className={cardClass} onClick={handleCardClick} style={{ pointerEvents: 'auto' }}>
      <CardContent className="p-4 space-y-3" style={{ pointerEvents: 'auto' }}>
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

        <div className="card-actions relative z-[10] flex flex-col sm:flex-row gap-2" style={{ pointerEvents: 'auto', position: 'relative' }}>
          {isValidPhone(location.phone) ? (
            <a
              data-testid="provider-phone-link"
              href={`tel:${sanitizePhone(location.phone!)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Call ${location.name}`}
              className="btn btn-sm inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors flex-1 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
              style={{ pointerEvents: 'auto' }}
              onClick={(e) => { e.stopPropagation(); handleCall(); }}
            >
              📞 Call
            </a>
          ) : (
            <button
              disabled
              className="btn btn-sm btn-disabled inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium flex-1 opacity-50 cursor-not-allowed border bg-gray-100"
              aria-label="No phone available"
            >
              📞 No Phone
            </button>
          )}
          
          {location.address ? (
            <a
              data-testid="provider-directions-link"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Get directions to ${location.name}`}
              className="btn btn-sm inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors flex-1 border hover:bg-accent cursor-pointer"
              style={{ pointerEvents: 'auto' }}
              onClick={(e) => { e.stopPropagation(); handleDirections(); }}
            >
              🗺️ Directions
            </a>
          ) : (
            <button
              disabled
              className="btn btn-sm btn-disabled inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium flex-1 opacity-50 cursor-not-allowed border bg-gray-100"
              aria-label="No address available"
            >
              🗺️ No Address
            </button>
          )}

          {getWebsite() ? (
            <a
              data-testid="provider-website-link"
              href={getWebsite()!}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Visit ${location.name} website`}
              className="btn btn-sm inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors flex-1 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
              style={{ pointerEvents: 'auto' }}
              onClick={(e) => { e.stopPropagation(); handleWebsite(); }}
            >
              🌐 Website
            </a>
          ) : (
            <button
              disabled
              className="btn btn-sm btn-disabled inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium flex-1 opacity-50 cursor-not-allowed border bg-gray-100"
              aria-label="No website available"
            >
              🌐 No Website
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
