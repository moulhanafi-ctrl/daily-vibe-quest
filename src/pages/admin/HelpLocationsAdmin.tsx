import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, MapPin, Check, X, Download, Upload, RefreshCw } from "lucide-react";

interface HelpLocation {
  id: string;
  name: string;
  type: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  phone?: string;
  website_url?: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  tags?: string[];
}

export default function HelpLocationsAdmin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [locations, setLocations] = useState<HelpLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [isGeocoding, setIsGeocoding] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<Partial<HelpLocation>>({
    name: "",
    type: "therapy",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postal_code: "",
    phone: "",
    website_url: "",
    is_active: true,
    tags: [],
  });

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const { data, error } = await supabase
        .from("help_locations")
        .select("*")
        .order("name");

      if (error) throw error;
      setLocations(data || []);
    } catch (error: any) {
      console.error("Error loading locations:", error);
      toast({
        title: "Error",
        description: "Failed to load help locations",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.type || !formData.postal_code) {
        toast({
          title: "Validation Error",
          description: "Name, type, and postal code are required",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("help_locations")
        .insert([{
          name: formData.name!,
          type: formData.type as "crisis" | "therapy",
          address_line1: formData.address_line1,
          address_line2: formData.address_line2,
          city: formData.city,
          state: formData.state,
          postal_code: formData.postal_code!,
          phone: formData.phone,
          website_url: formData.website_url,
          is_active: formData.is_active ?? true,
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Location added successfully",
      });

      setIsDialogOpen(false);
      setFormData({
        name: "",
        type: "therapy",
        address_line1: "",
        address_line2: "",
        city: "",
        state: "",
        postal_code: "",
        phone: "",
        website_url: "",
        is_active: true,
        tags: [],
      });
      loadLocations();
    } catch (error: any) {
      console.error("Error saving location:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save location",
        variant: "destructive",
      });
    }
  };

  const handleGeocodeSelected = async () => {
    setIsGeocoding(true);
    try {
      const locationsNeedingGeocode = locations.filter(
        loc => !loc.latitude || !loc.longitude
      );

      toast({
        title: "Geocoding Started",
        description: `Processing ${locationsNeedingGeocode.length} locations...`,
      });

      let successCount = 0;
      let failCount = 0;

      for (const location of locationsNeedingGeocode) {
        try {
          // Use Zippopotam.us for ZIP centroid
          const response = await fetch(
            `https://api.zippopotam.us/us/${location.postal_code}`
          );
          
          if (response.ok) {
            const data = await response.json();
            const place = data.places?.[0];
            
            if (place) {
              const lat = parseFloat(place.latitude);
              const lon = parseFloat(place.longitude);

              const { error } = await supabase
                .from("help_locations")
                .update({ latitude: lat, longitude: lon })
                .eq("id", location.id);

              if (!error) {
                successCount++;
              } else {
                failCount++;
              }
            }
          } else {
            failCount++;
          }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (err) {
          console.error(`Failed to geocode ${location.name}:`, err);
          failCount++;
        }
      }

      toast({
        title: "Geocoding Complete",
        description: `Success: ${successCount}, Failed: ${failCount}`,
      });

      loadLocations();
    } catch (error: any) {
      console.error("Geocoding error:", error);
      toast({
        title: "Error",
        description: "Bulk geocoding failed",
        variant: "destructive",
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("help_locations")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Location ${!currentStatus ? 'activated' : 'deactivated'}`,
      });

      loadLocations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update location status",
        variant: "destructive",
      });
    }
  };

  const handleExportCSV = () => {
    const csv = [
      ["name", "type", "address_line1", "city", "state", "postal_code", "phone", "website_url", "latitude", "longitude", "is_active"],
      ...locations.map(loc => [
        loc.name,
        loc.type,
        loc.address_line1 || "",
        loc.city || "",
        loc.state || "",
        loc.postal_code || "",
        loc.phone || "",
        loc.website_url || "",
        loc.latitude || "",
        loc.longitude || "",
        loc.is_active ? "true" : "false",
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `help_locations_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLocations = locations.filter(loc => {
    const matchesSearch = loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loc.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loc.state?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || loc.type === filterType;
    return matchesSearch && matchesType;
  });

  const missingCoordsCount = locations.filter(
    loc => !loc.latitude || !loc.longitude
  ).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/admin/ops")} className="mb-2">
            ← Back to Admin
          </Button>
          <h1 className="text-3xl font-bold">Help Locations Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage mental health resources, therapists, and crisis centers
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{locations.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Missing Coordinates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{missingCoordsCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {locations.filter(l => l.is_active).length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Locations</CardTitle>
                <CardDescription>Search and manage help locations</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleGeocodeSelected}
                  disabled={missingCoordsCount === 0 || isGeocoding}
                  variant="outline"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isGeocoding ? 'animate-spin' : ''}`} />
                  Geocode Missing ({missingCoordsCount})
                </Button>
                <Button onClick={handleExportCSV} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Location
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add New Location</DialogTitle>
                      <DialogDescription>
                        Enter the details for the new help location
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Name *</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Organization name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="type">Type *</Label>
                          <Select
                            value={formData.type}
                            onValueChange={(value) => setFormData({ ...formData, type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="therapy">Therapy</SelectItem>
                              <SelectItem value="crisis">Crisis Center</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="address1">Address Line 1</Label>
                        <Input
                          id="address1"
                          value={formData.address_line1}
                          onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                          placeholder="Street address"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="city">City</Label>
                          <Input
                            id="city"
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">State</Label>
                          <Input
                            id="state"
                            value={formData.state}
                            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                            maxLength={2}
                            placeholder="CA"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="zip">ZIP Code *</Label>
                          <Input
                            id="zip"
                            value={formData.postal_code}
                            onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                            maxLength={5}
                            pattern="[0-9]{5}"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="555-1234"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="website">Website</Label>
                          <Input
                            id="website"
                            value={formData.website_url}
                            onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                            placeholder="https://..."
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="active"
                          checked={formData.is_active}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                        />
                        <Label htmlFor="active">Active</Label>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSave}>Save Location</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <Input
                placeholder="Search by name, city, or state..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="therapy">Therapy</SelectItem>
                  <SelectItem value="crisis">Crisis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Coords</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLocations.map((location) => (
                    <TableRow key={location.id}>
                      <TableCell className="font-medium">{location.name}</TableCell>
                      <TableCell>
                        <Badge variant={location.type === "crisis" ? "destructive" : "default"}>
                          {location.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {[location.city, location.state, location.postal_code]
                          .filter(Boolean)
                          .join(", ")}
                      </TableCell>
                      <TableCell>
                        {location.latitude && location.longitude ? (
                          <Badge variant="secondary" className="gap-1">
                            <MapPin className="h-3 w-3" />
                            <Check className="h-3 w-3" />
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <MapPin className="h-3 w-3" />
                            <X className="h-3 w-3" />
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={location.is_active ? "default" : "secondary"}>
                          {location.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleActive(location.id, location.is_active)}
                        >
                          {location.is_active ? "Deactivate" : "Activate"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredLocations.length === 0 && !isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                No locations found matching your search
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
