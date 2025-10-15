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

  const formatPhone = (phone?: string) => {
    if (!phone) return "";
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
  };

  const handleCall = (therapist: Therapist) => {
    if (therapist.phone) {
      const cleanPhone = therapist.phone.replace(/[^\d+]/g, "");
      window.location.href = `tel:${cleanPhone}`;
      trackEvent({
        eventType: "therapist_phone_clicked",
        metadata: { id: therapist.id, name: therapist.name, zip: zipCode, radius: parseInt(radius) },
      });
    }
  };

  const getRawWebsite = (t: Therapist) => {
    const anyT: any = t as any;
    return t.website_url || anyT.website || anyT.url || anyT.link || anyT.homepage;
  };

  const getValidWebsiteUrl = (url?: string) => {
    console.log("getValidWebsiteUrl called with:", url);
    if (!url) {
      console.log("No URL provided");
      return null;
    }
    let u = url.trim();
    if (!/^https?:\/\//i.test(u)) {
      u = `https://${u}`;
    }
    try {
      const parsed = new URL(u);
      console.log("Valid URL created:", parsed.href);
      return parsed.href;
    } catch (e) {
      console.error("Invalid URL:", e);
      return null;
    }
  };

  const handleWebsite = (therapist: Therapist) => {
    console.log("handleWebsite clicked for:", therapist.name, "URL:", therapist.website_url);
    const href = getValidWebsiteUrl(therapist.website_url);
    console.log("Validated href:", href);
    if (!href) {
      toast.error("Sorry, this website link is unavailable.");
      return;
    }
    try {
      const opened = window.open(href, "_blank");
      console.log("window.open result:", opened);
      if (!opened) {
        toast.error("Please allow popups for this site");
        console.log("Popup was blocked");
      }
      trackEvent({
        eventType: "therapist_website_clicked",
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
  };

  const handleDirections = (therapist: Therapist) => {
    if (therapist.address) {
      const query = encodeURIComponent(therapist.address);
      window.open(`https://maps.google.com/?q=${query}`, "_blank");
      trackEvent({
        eventType: "therapist_directions_clicked",
        metadata: { id: therapist.id, name: therapist.name },
      });
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredTherapists.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTherapists = filteredTherapists.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="min-h-screen bg-background pb-20">
      <CrisisBanner />
      <div className="container mx-auto px-4 py-8 max-w-7xl pb-8 overflow-x-hidden">
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
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-8 w-full">
              {paginatedTherapists.map((therapist) => (
                <Card key={therapist.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-lg">{therapist.name}</CardTitle>
                    <CardDescription className="text-sm space-y-1">
                      <div className="flex items-start gap-1.5">
                        <span aria-hidden>📍</span>
                        <span>{therapist.address || "No address provided"}</span>
                      </div>
                      {therapist.phone && (
                        <div className="flex items-center gap-1.5 text-foreground font-medium">
                          <Phone className="h-3.5 w-3.5" />
                          <a 
                            href={`tel:${therapist.phone.replace(/[^\d+]/g, "")}`}
                            className="hover:text-primary transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCall(therapist);
                            }}
                            aria-label={`Call ${therapist.name}`}
                          >
                            {formatPhone(therapist.phone)}
                          </a>
                        </div>
                      )}
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
                    {(therapist.phone || therapist.website_url) && (
                      <div 
                        className="card-actions relative z-[50] flex flex-wrap gap-3 pt-2"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        onPointerUp={(e) => e.stopPropagation()}
                      >
                        {therapist.phone && (
                          <a
                            href={`tel:${therapist.phone.replace(/\D/g, '')}`}
                            className="inline-flex items-center gap-2 underline pointer-events-auto min-h-[44px] px-2 py-1 text-primary hover:text-primary/80"
                            aria-label={`Call ${therapist.name}`}
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              handleCall(therapist); 
                            }}
                          >
                            📞 Phone
                          </a>
                        )}

                        {therapist.website_url && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 underline pointer-events-auto min-h-[44px] px-2 py-1 text-primary hover:text-primary/80"
                            aria-label={`Open website for ${therapist.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              const url = getValidWebsiteUrl(therapist.website_url);
                              if (!url) {
                                toast.error("Sorry, this website link is unavailable.");
                                return;
                              }
                              window.open(url, '_blank', 'noopener,noreferrer');
                              trackEvent({
                                eventType: "therapist_website_clicked",
                                metadata: { id: therapist.id, name: therapist.name, zip: zipCode, radius: parseInt(radius) },
                              });
                            }}
                          >
                            🌐 Website
                          </button>
                        )}
                      </div>
                    )}
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
