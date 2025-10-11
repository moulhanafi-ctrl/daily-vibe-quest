import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, ExternalLink, Navigation, Flag, Clock } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

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

  const handleCall = () => {
    trackEvent({
      eventType: "help_call_clicked",
      metadata: { id: location.id, type: location.type }
    });
    if (location.phone) {
      window.location.href = `tel:${location.phone}`;
    }
  };

  const handleWebsite = () => {
    trackEvent({
      eventType: "help_website_clicked",
      metadata: { id: location.id, type: location.type }
    });
    if (location.website_url) {
      window.open(location.website_url, "_blank");
    }
  };

  const handleDirections = () => {
    trackEvent({
      eventType: "help_directions_clicked",
      metadata: { id: location.id, type: location.type }
    });
    const query = encodeURIComponent(location.address);
    window.open(`https://maps.google.com/?q=${query}`, "_blank");
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-lg">{location.name}</h3>
            {location.type === "crisis" && (
              <Badge variant="destructive" className="shrink-0">Crisis</Badge>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground">{location.address}</p>
          
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

        <div className="flex gap-2 flex-wrap">
          {location.phone && (
            <Button
              onClick={handleCall}
              size="sm"
              variant={location.type === "crisis" ? "default" : "outline"}
            >
              <Phone className="h-4 w-4 mr-1" />
              Call
            </Button>
          )}
          {location.website_url && (
            <Button
              onClick={handleWebsite}
              size="sm"
              variant={location.type === "therapy" ? "default" : "outline"}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Website
            </Button>
          )}
          {!location.is_national && (
            <Button onClick={handleDirections} size="sm" variant="outline">
              <Navigation className="h-4 w-4 mr-1" />
              Directions
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
