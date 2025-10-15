import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Globe, Navigation, ChevronLeft, ChevronRight, Search, Filter } from "lucide-react";
import { CrisisBanner } from "@/components/help/CrisisBanner";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Therapist {
  id: string;
  name: string;
  address: string;
  phone?: string;
  website_url?: string;
  distance_miles?: number;
  tags?: string[];
  accepts_insurance?: boolean;
  sliding_scale?: boolean;
  telehealth?: boolean;
  ratings?: { avg?: number; count?: number };
}

const tagLabels: Record<string, string> = {
  "lgbtq_affirming": "LGBTQ+ Affirming",
  "bilingual": "Bilingual",
  "multilingual": "Multilingual",
  "youth_friendly": "Youth Friendly",
  "trauma_specialized": "Trauma Specialized",
};

export default function TherapistsNearby() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [zipCode, setZipCode] = useState(searchParams.get("zip") || "");
  const [radius, setRadius] = useState(searchParams.get("radius") || "50");
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [filteredTherapists, setFilteredTherapists] = useState<Therapist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useState("distance");
  const [filterInsurance, setFilterInsurance] = useState(false);
  const [filterTelehealth, setFilterTelehealth] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    if (zipCode) {
      handleSearch();
    }
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [therapists, searchText, sortBy, filterInsurance, filterTelehealth]);

  const handleSearch = async () => {
    if (!zipCode || !/^\d{5}$/.test(zipCode)) {
      toast.error("Please enter a valid 5-digit ZIP code");
      return;
    }

    setIsLoading(true);
    setCurrentPage(1);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to search for therapists");
        navigate("/auth");
        return;
      }

      const response = await supabase.functions.invoke("local-help", {
        body: { 
          zip_code: zipCode,
          radius: parseInt(radius)
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw response.error;

      const results = response.data?.therapists || [];
      setTherapists(results);
      
      // Update URL params
      setSearchParams({ zip: zipCode, radius });

      trackEvent({
        eventType: "therapist_results_viewed",
        metadata: { 
          zip: zipCode, 
          radius: parseInt(radius),
          count: results.length 
        },
      });

      if (results.length === 0) {
        toast.error("No therapists found. Try widening your search radius.");
      } else {
        toast.success(`Found ${results.length} therapists`);
      }
    } catch (error) {
      console.error("Error searching:", error);
      toast.error("Failed to search. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...therapists];

    // Text search
    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(search) ||
        t.address.toLowerCase().includes(search) ||
        t.tags?.some(tag => tag.toLowerCase().includes(search))
      );
    }

    // Insurance filter
    if (filterInsurance) {
      filtered = filtered.filter(t => t.accepts_insurance);
    }

    // Telehealth filter
    if (filterTelehealth) {
      filtered = filtered.filter(t => t.telehealth);
    }

    // Sort
    switch (sortBy) {
      case "distance":
        filtered.sort((a, b) => (a.distance_miles || 999) - (b.distance_miles || 999));
        break;
      case "rating":
        filtered.sort((a, b) => (b.ratings?.avg || 0) - (a.ratings?.avg || 0));
        break;
      case "name":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    setFilteredTherapists(filtered);
  };

  const handleCall = (therapist: Therapist) => {
    if (therapist.phone) {
      const cleanPhone = therapist.phone.replace(/[^\d+]/g, "");
      window.location.href = `tel:${cleanPhone}`;
      trackEvent({
        eventType: "therapist_card_website_clicked",
        metadata: { id: therapist.id },
      });
    }
  };

  const handleWebsite = (therapist: Therapist) => {
    if (therapist.website_url) {
      try {
        window.open(therapist.website_url, "_blank");
        trackEvent({
          eventType: "therapist_card_website_clicked",
          metadata: { 
            id: therapist.id, 
            name: therapist.name,
            zip: zipCode,
            radius: parseInt(radius)
          },
        });
      } catch (error) {
        toast.error("Sorry, this website link is unavailable.");
        console.error("Failed to open website:", error);
      }
    }
  };

  const handleDirections = (therapist: Therapist) => {
    if (therapist.address) {
      const query = encodeURIComponent(therapist.address);
      window.open(`https://maps.google.com/?q=${query}`, "_blank");
      trackEvent({
        eventType: "therapist_card_directions_clicked",
        metadata: { id: therapist.id },
      });
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredTherapists.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTherapists = filteredTherapists.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="min-h-screen bg-background">
      <CrisisBanner />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-muted-foreground">
          <button 
            onClick={() => navigate("/help")} 
            className="hover:text-foreground transition-colors"
          >
            Help
          </button>
          <span className="mx-2">›</span>
          <span className="text-foreground">Therapists near me</span>
        </nav>

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Therapists Near Me</h1>
            <p className="text-muted-foreground mt-2">
              Licensed mental health professionals in your area
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/help")}>
            ← Back to Help
          </Button>
        </div>

        {/* Search & Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Search Criteria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="ZIP code"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                maxLength={5}
                className="max-w-[150px]"
              />
              <Select value={radius} onValueChange={setRadius}>
                <SelectTrigger className="max-w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 miles</SelectItem>
                  <SelectItem value="50">50 miles</SelectItem>
                  <SelectItem value="75">75 miles</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleSearch} disabled={isLoading}>
                {isLoading ? "Searching..." : "Search"}
              </Button>
            </div>

            {therapists.length > 0 && (
              <>
                <div className="flex gap-2 flex-wrap">
                  <div className="flex-1 min-w-[200px] relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, location, specialty..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="distance">Distance</SelectItem>
                      <SelectItem value="rating">Rating</SelectItem>
                      <SelectItem value="name">Name (A-Z)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 flex-wrap items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filters:
                  </span>
                  <Button
                    variant={filterInsurance ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterInsurance(!filterInsurance)}
                  >
                    Accepts Insurance
                  </Button>
                  <Button
                    variant={filterTelehealth ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterTelehealth(!filterTelehealth)}
                  >
                    Telehealth Available
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground">
                  Showing {filteredTherapists.length} of {therapists.length} results
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : paginatedTherapists.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                {therapists.length === 0 
                  ? "No therapists found. Try a different ZIP code or wider radius."
                  : "No therapists match your filters. Try adjusting your search criteria."}
              </p>
              {therapists.length === 0 && (
                <Button onClick={() => setRadius("75")}>
                  Search wider radius (75 miles)
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
              {paginatedTherapists.map((therapist) => (
                <Card key={therapist.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-lg">{therapist.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {therapist.address}
                    </CardDescription>
                    {therapist.distance_miles !== undefined && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Navigation className="h-3 w-3" />
                        {therapist.distance_miles.toFixed(1)} miles away
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
                        {therapist.sliding_scale && <p>• Sliding scale available</p>}
                        {therapist.telehealth && <p>• Telehealth available</p>}
                      </div>
                      {therapist.ratings?.avg && (
                        <p className="text-sm font-medium">
                          ⭐ {therapist.ratings.avg.toFixed(1)} ({therapist.ratings.count} reviews)
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        {therapist.phone && (
                          <Button 
                            onClick={() => handleCall(therapist)}
                            variant="outline"
                            className="flex-1"
                            aria-label={`Call ${therapist.name}`}
                          >
                            <Phone className="h-4 w-4 mr-2" />
                            Call
                          </Button>
                        )}
                        <Button 
                          onClick={() => handleDirections(therapist)}
                          variant="outline"
                          className="flex-1"
                          aria-label={`Get directions to ${therapist.name}`}
                        >
                          <Navigation className="h-4 w-4 mr-2" />
                          Directions
                        </Button>
                      </div>
                      {therapist.website_url ? (
                        <Button 
                          onClick={() => handleWebsite(therapist)}
                          className="w-full hover:opacity-90 transition-opacity"
                          aria-label={`Open ${therapist.name} website in new tab`}
                        >
                          <Globe className="h-4 w-4 mr-2" />
                          Visit Website
                        </Button>
                      ) : therapist.phone ? (
                        <Button 
                          onClick={() => handleCall(therapist)}
                          variant="outline"
                          className="w-full"
                          aria-label={`Call ${therapist.name} clinic`}
                        >
                          <Phone className="h-4 w-4 mr-2" />
                          Call Clinic
                        </Button>
                      ) : (
                        <Button 
                          disabled 
                          className="w-full" 
                          title="Website not provided"
                          aria-label="No website available"
                        >
                          <Globe className="h-4 w-4 mr-2" />
                          No Website
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        )}
      </div>
    </div>
  );
}
