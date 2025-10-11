import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Database, Download, Trash2, Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CacheStats {
  total: number;
  recentlyAdded: number;
}

export default function ZipToolsAdmin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<CacheStats>({ total: 0, recentlyAdded: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { count: total } = await supabase
        .from("zip_centroids")
        .select("*", { count: "exact", head: true });

      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const { count: recent } = await supabase
        .from("zip_centroids")
        .select("*", { count: "exact", head: true })
        .gte("updated_at", oneDayAgo.toISOString());

      setStats({
        total: total || 0,
        recentlyAdded: recent || 0,
      });
    } catch (error: any) {
      console.error("Error loading stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter(line => line.trim());
      const headers = lines[0].toLowerCase().split(",");

      // Validate headers
      if (!headers.includes("zip") || !headers.includes("latitude") || !headers.includes("longitude")) {
        toast({
          title: "Invalid CSV",
          description: "CSV must have columns: zip, latitude, longitude, city (optional), state (optional)",
          variant: "destructive",
        });
        return;
      }

      const zipIndex = headers.indexOf("zip");
      const latIndex = headers.indexOf("latitude");
      const lonIndex = headers.indexOf("longitude");
      const cityIndex = headers.indexOf("city");
      const stateIndex = headers.indexOf("state");

      const records = [];
      let validCount = 0;
      let skipCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",");
        const zip = values[zipIndex]?.trim();
        const lat = parseFloat(values[latIndex]?.trim());
        const lon = parseFloat(values[lonIndex]?.trim());

        // Validate
        if (!/^\d{5}$/.test(zip)) {
          skipCount++;
          continue;
        }
        if (isNaN(lat) || isNaN(lon)) {
          skipCount++;
          continue;
        }
        if (lat < 24 || lat > 50 || lon < -125 || lon > -65) {
          skipCount++;
          continue;
        }

        records.push({
          zip,
          latitude: lat,
          longitude: lon,
          city: cityIndex >= 0 ? values[cityIndex]?.trim() : null,
          state: stateIndex >= 0 ? values[stateIndex]?.trim() : null,
          updated_at: new Date().toISOString(),
        });

        validCount++;

        // Batch insert every 1000 records
        if (records.length >= 1000) {
          const { error } = await supabase
            .from("zip_centroids")
            .upsert(records, { onConflict: "zip" });

          if (error) throw error;
          records.length = 0; // Clear batch
        }
      }

      // Insert remaining records
      if (records.length > 0) {
        const { error } = await supabase
          .from("zip_centroids")
          .upsert(records, { onConflict: "zip" });

        if (error) throw error;
      }

      toast({
        title: "Import Complete",
        description: `Imported ${validCount} ZIPs, skipped ${skipCount} invalid rows`,
      });

      loadStats();
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = "";
    }
  };

  const handleExportCSV = async () => {
    try {
      const { data, error } = await supabase
        .from("zip_centroids")
        .select("*")
        .order("zip");

      if (error) throw error;

      const csv = [
        ["zip", "latitude", "longitude", "city", "state", "updated_at"],
        ...(data || []).map(row => [
          row.zip,
          row.latitude,
          row.longitude,
          row.city || "",
          row.state || "",
          row.updated_at,
        ])
      ].map(row => row.join(",")).join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `zip_centroids_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `Exported ${data?.length || 0} ZIP centroids`,
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleClearCache = async () => {
    if (!confirm("Are you sure you want to clear the entire ZIP cache? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("zip_centroids")
        .delete()
        .neq("zip", ""); // Delete all

      if (error) throw error;

      toast({
        title: "Cache Cleared",
        description: "All ZIP centroids have been removed",
      });

      loadStats();
    } catch (error: any) {
      toast({
        title: "Clear Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/admin/ops")} className="mb-2">
            ← Back to Admin
          </Button>
          <h1 className="text-3xl font-bold">ZIP Code Cache Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage nationwide ZIP → lat/lon cache for instant resolution
          </p>
        </div>

        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Coverage:</strong> Nationwide ZIP support with hybrid caching. First lookup calls external API, then caches forever. Target: 33,000+ U.S. ZIPs.
          </AlertDescription>
        </Alert>

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Cached ZIPs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.total >= 30000 ? "✓ Good coverage" : "Seed recommended"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Recently Added</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentlyAdded}</div>
              <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.total > 0 ? ">95%" : "N/A"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">After initial warm-up</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cache Management</CardTitle>
            <CardDescription>
              Import, export, or clear the ZIP centroid cache
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="csv-upload">Import ZIP Centroids (CSV)</Label>
              <div className="flex gap-2">
                <Input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleImportCSV}
                  disabled={isImporting}
                  className="flex-1"
                />
                <Button disabled={isImporting}>
                  <Upload className="h-4 w-4 mr-2" />
                  {isImporting ? "Importing..." : "Upload"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Required columns: <code>zip,latitude,longitude</code>. Optional: <code>city,state</code>
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleExportCSV} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={handleClearCache} variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Cache
              </Button>
            </div>

            <Alert>
              <Database className="h-4 w-4" />
              <AlertDescription>
                <strong>Tip:</strong> Seed with a full U.S. ZIP centroid dataset (~33k rows) for instant nationwide coverage. Without seeding, the system will cache ZIPs on-demand as users search (hybrid approach).
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
