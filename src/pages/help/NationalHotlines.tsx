import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Globe, Clock, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CrisisBanner } from "@/components/help/CrisisBanner";
import { trackEvent } from "@/lib/analytics";

interface NationalHotline {
  id: string;
  name: string;
  type: "crisis" | "therapy";
  phone?: string;
  website_url?: string;
  description?: string;
  tags?: string[];
  open_hours?: any;
}

export default function NationalHotlines() {
  const navigate = useNavigate();
  const [hotlines, setHotlines] = useState<NationalHotline[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadNationalHotlines = async () => {
      try {
        const { data, error } = await supabase
          .from("help_locations")
          .select("*")
          .eq("is_national", true)
          .order("priority", { ascending: false });

        if (error) throw error;

        setHotlines(data || []);

        await trackEvent({
          eventType: "help_national_viewed",
          metadata: { count: data?.length || 0 },
        });
      } catch (error) {
        console.error("Error loading national hotlines:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNationalHotlines();
  }, []);

  const handleCall = (hotline: NationalHotline) => {
    if (hotline.phone) {
      window.location.href = `tel:${hotline.phone}`;
      trackEvent({
        eventType: "help_call_clicked",
        metadata: { 
          id: hotline.id, 
          type: hotline.type,
          is_national: true
        },
      });
    }
  };

  const handleWebsite = (hotline: NationalHotline) => {
    if (hotline.website_url) {
      window.open(hotline.website_url, "_blank");
      trackEvent({
        eventType: "help_website_clicked",
        metadata: { 
          id: hotline.id, 
          type: hotline.type,
          is_national: true
        },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <CrisisBanner />
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex items-center justify-center p-8">
            <div className="text-muted-foreground">Loading hotlines...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CrisisBanner />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
            ← Back
          </Button>
          <h1 className="text-3xl font-bold">National Hotlines & Resources</h1>
          <p className="text-muted-foreground mt-2">
            24/7 crisis support and mental health resources available nationwide
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {hotlines.map((hotline) => (
            <Card key={hotline.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{hotline.name}</CardTitle>
                  {hotline.type === "crisis" && (
                    <Badge variant="destructive" className="shrink-0">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Crisis
                    </Badge>
                  )}
                </div>
                {hotline.description && (
                  <CardDescription className="mt-2">
                    {hotline.description}
                  </CardDescription>
                )}
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
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {hotline.phone && (
                    <Button 
                      onClick={() => handleCall(hotline)}
                      className="w-full"
                      size="lg"
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Call {hotline.phone}
                    </Button>
                  )}
                  {hotline.website_url && (
                    <Button 
                      onClick={() => handleWebsite(hotline)}
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

        {hotlines.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>No National Hotlines Available</CardTitle>
              <CardDescription>
                Please contact 988 for immediate crisis support.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <div className="mt-8 flex justify-center">
          <Button 
            onClick={() => navigate('/help/nearby')} 
            variant="outline"
          >
            ← Back to Local Resources
          </Button>
        </div>
      </div>
    </div>
  );
}