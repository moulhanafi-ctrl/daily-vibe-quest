import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit, Trash, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function HelpAdmin() {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadLocations();
    }
  }, [isAdmin]);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roles) {
      toast.error("Access denied: Admin role required");
      navigate("/dashboard");
      return;
    }

    setIsAdmin(true);
  };

  const loadLocations = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("help_locations")
        .select("*")
        .order("priority", { ascending: false });

      setLocations(data || []);
    } catch (error) {
      console.error("Error loading locations:", error);
      toast.error("Failed to load locations");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (location: any) => {
    try {
      if (location.id) {
        const { error } = await supabase
          .from("help_locations")
          .update(location)
          .eq("id", location.id);

        if (error) throw error;
        toast.success("Location updated");
      } else {
        const { error } = await supabase
          .from("help_locations")
          .insert([location]);

        if (error) throw error;
        toast.success("Location added");
      }

      loadLocations();
      setEditDialogOpen(false);
      setCurrentLocation(null);
    } catch (error) {
      console.error("Error saving location:", error);
      toast.error("Failed to save location");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this location?")) return;

    try {
      const { error } = await supabase
        .from("help_locations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Location deleted");
      loadLocations();
    } catch (error) {
      console.error("Error deleting location:", error);
      toast.error("Failed to delete location");
    }
  };

  const handleVerify = async (id: string) => {
    try {
      const { error } = await supabase
        .from("help_locations")
        .update({ last_verified_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      toast.success("Location verified");
      loadLocations();
    } catch (error) {
      console.error("Error verifying location:", error);
      toast.error("Failed to verify location");
    }
  };

  if (!isAdmin) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Button variant="ghost" onClick={() => navigate("/admin/analytics")}>
            ← Back to Admin
          </Button>
          <h1 className="text-3xl font-bold mt-2">Help Directory Admin</h1>
          <p className="text-muted-foreground">Manage crisis and therapy resources</p>
        </div>
        <Button onClick={() => {
          setCurrentLocation({
            type: "therapy",
            name: "",
            phone: "",
            website_url: "",
            address: "",
            zip_coverage: [],
            tags: [],
            priority: 0,
            is_national: false
          });
          setEditDialogOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Location
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-8">Loading...</p>
      ) : (
        <div className="space-y-4">
          {locations.map((location) => (
            <Card key={location.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{location.name}</h3>
                      <Badge variant={location.type === "crisis" ? "destructive" : "default"}>
                        {location.type}
                      </Badge>
                      {location.is_national && (
                        <Badge variant="outline">National</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{location.address}</p>
                    <p className="text-sm text-muted-foreground">
                      ZIP: {location.zip_coverage?.join(", ") || "N/A"}
                    </p>
                    {location.last_verified_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last verified: {new Date(location.last_verified_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleVerify(location.id)}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCurrentLocation(location);
                        setEditDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(location.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {currentLocation && (
        <LocationEditDialog
          location={currentLocation}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function LocationEditDialog({ location, open, onOpenChange, onSave }: any) {
  const [formData, setFormData] = useState(location);

  useEffect(() => {
    setFormData(location);
  }, [location]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{formData.id ? "Edit" : "Add"} Location</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="crisis">Crisis</SelectItem>
                  <SelectItem value="therapy">Therapy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority (0-100)</Label>
              <Input
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={formData.phone || ""}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input
                value={formData.website_url || ""}
                onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Address</Label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>ZIP Coverage (comma-separated)</Label>
            <Input
              placeholder="12345, 12346"
              value={formData.zip_coverage?.join(", ") || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  zip_coverage: e.target.value.split(",").map((z) => z.trim()),
                })
              }
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="national"
                checked={formData.is_national}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_national: checked })
                }
              />
              <Label htmlFor="national">National Resource</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="telehealth"
                checked={formData.telehealth}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, telehealth: checked })
                }
              />
              <Label htmlFor="telehealth">Telehealth</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sliding_scale"
                checked={formData.sliding_scale}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, sliding_scale: checked })
                }
              />
              <Label htmlFor="sliding_scale">Sliding Scale</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
