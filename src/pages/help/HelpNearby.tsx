import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MapPin, Search, SlidersHorizontal } from "lucide-react";
import { HelpLocationCard } from "@/components/help/HelpLocationCard";
import { ZipCodeModal } from "@/components/help/ZipCodeModal";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";

export default function HelpNearby() {
  const [zipModalOpen, setZipModalOpen] = useState(false);
  const [userZip, setUserZip] = useState<string | null>(null);
  const [ageGroup, setAgeGroup] = useState<string>("");
  const [locations, setLocations] = useState<any[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "crisis" | "therapy">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    telehealth: false,
    sliding_scale: false,
    lgbtq_affirming: false,
    youth_friendly: false,
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (userZip) {
      loadLocations();
    } else {
      setZipModalOpen(true);
    }
  }, [userZip]);

  useEffect(() => {
    applyFilters();
  }, [locations, activeTab, searchQuery, filters]);

  const loadUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("location, age_group")
      .eq("id", user.id)
      .single();

    if (profile?.location && typeof profile.location === 'object' && 'zip' in profile.location) {
      setUserZip(profile.location.zip as string);
    }
    if (profile?.age_group) {
      setAgeGroup(profile.age_group);
    }
  };

  const loadLocations = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("help_locations")
        .select("*")
        .or(`is_national.eq.true,zip_coverage.cs.{${userZip}}`)
        .order("priority", { ascending: false });

      setLocations(data || []);
    } catch (error) {
      console.error("Error loading locations:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = locations;

    // Filter by tab
    if (activeTab !== "all") {
      filtered = filtered.filter((loc) => loc.type === activeTab);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (loc) =>
          loc.name.toLowerCase().includes(query) ||
          loc.address.toLowerCase().includes(query)
      );
    }

    // Filter by options
    if (filters.telehealth) {
      filtered = filtered.filter((loc) => loc.telehealth);
    }
    if (filters.sliding_scale) {
      filtered = filtered.filter((loc) => loc.sliding_scale);
    }
    if (filters.lgbtq_affirming) {
      filtered = filtered.filter((loc) => loc.tags?.includes("lgbtq_affirming"));
    }
    if (filters.youth_friendly) {
      filtered = filtered.filter((loc) => loc.tags?.includes("youth_friendly"));
    }

    setFilteredLocations(filtered);

    trackEvent({
      eventType: "help_filter_changed",
      metadata: { tab: activeTab, filters, searchQuery }
    });
  };

  const handleZipSaved = (zip: string) => {
    setUserZip(zip);
  };

  const toggleFilter = (key: keyof typeof filters) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
              ← Back
            </Button>
            <h1 className="text-3xl font-bold">Local Help Directory</h1>
            <p className="text-muted-foreground">
              {userZip ? `Near ${userZip}` : "Loading..."}
            </p>
          </div>
          <Button variant="outline" onClick={() => setZipModalOpen(true)}>
            <MapPin className="h-4 w-4 mr-2" />
            Change ZIP
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <Button
            variant={filters.telehealth ? "default" : "outline"}
            size="sm"
            onClick={() => toggleFilter("telehealth")}
          >
            Telehealth
          </Button>
          <Button
            variant={filters.sliding_scale ? "default" : "outline"}
            size="sm"
            onClick={() => toggleFilter("sliding_scale")}
          >
            Sliding Scale
          </Button>
          <Button
            variant={filters.lgbtq_affirming ? "default" : "outline"}
            size="sm"
            onClick={() => toggleFilter("lgbtq_affirming")}
          >
            LGBTQ+ Affirming
          </Button>
          <Button
            variant={filters.youth_friendly ? "default" : "outline"}
            size="sm"
            onClick={() => toggleFilter("youth_friendly")}
          >
            Youth Friendly
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="all">All ({locations.length})</TabsTrigger>
            <TabsTrigger value="crisis">
              Crisis ({locations.filter((l) => l.type === "crisis").length})
            </TabsTrigger>
            <TabsTrigger value="therapy">
              Therapy ({locations.filter((l) => l.type === "therapy").length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {loading ? (
              <p className="text-muted-foreground text-center py-8">Loading...</p>
            ) : filteredLocations.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No locations found matching your filters.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredLocations.map((location) => (
                  <HelpLocationCard key={location.id} location={location} ageGroup={ageGroup} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <ZipCodeModal
        open={zipModalOpen}
        onOpenChange={setZipModalOpen}
        onZipSaved={handleZipSaved}
      />
    </div>
  );
}
