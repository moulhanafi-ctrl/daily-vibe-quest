import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ArrowLeft, Download, Filter } from "lucide-react";
import { format } from "date-fns";
import { AdminGuard } from "@/components/admin/AdminGuard";

interface AnalyticsEvent {
  id: string;
  user_id: string | null;
  event_type: string;
  event_metadata: any;
  created_at: string;
  page_url: string | null;
}

export default function Analytics() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<AnalyticsEvent[]>([]);
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    filterEvents();
  }, [events, eventTypeFilter, searchQuery]);

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("analytics_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Failed to load events:", error);
      toast({
        title: "Error",
        description: "Failed to load analytics events",
        variant: "destructive",
      });
    }
  };

  const filterEvents = () => {
    let filtered = events;

    if (eventTypeFilter !== "all") {
      filtered = filtered.filter(e => e.event_type === eventTypeFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(e => 
        e.event_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.user_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        JSON.stringify(e.event_metadata).toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredEvents(filtered);
  };

  const exportToCSV = () => {
    const headers = ["Timestamp", "Event Type", "User ID", "Metadata", "Page URL"];
    const rows = filteredEvents.map(e => [
      format(new Date(e.created_at), "yyyy-MM-dd HH:mm:ss"),
      e.event_type,
      e.user_id || "N/A",
      JSON.stringify(e.event_metadata),
      e.page_url || "N/A"
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const uniqueEventTypes = Array.from(new Set(events.map(e => e.event_type))).sort();

  return (
    <AdminGuard requireMFA={false}>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin/ai")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Admin
        </Button>

        {/* Quick Links */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/admin/analytics/subscribers")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Subscriber Analytics
              </CardTitle>
              <CardDescription>
                Growth, opt-ins, and deliverability metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                View Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Analytics Events</CardTitle>
            <CardDescription>
              View and export system events for analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="sm:max-w-xs"
              />
              <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                <SelectTrigger className="sm:w-[200px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {uniqueEventTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={exportToCSV} variant="outline" className="sm:ml-auto">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              Showing {filteredEvents.length} of {events.length} events
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Event Type</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Metadata</TableHead>
                    <TableHead>Page</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="text-xs">
                        {format(new Date(event.created_at), "MMM d, HH:mm:ss")}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{event.event_type}</TableCell>
                      <TableCell className="text-xs font-mono">
                        {event.user_id ? event.user_id.slice(0, 8) + "..." : "N/A"}
                      </TableCell>
                      <TableCell className="text-xs max-w-xs truncate">
                        {JSON.stringify(event.event_metadata)}
                      </TableCell>
                      <TableCell className="text-xs">{event.page_url || "N/A"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </AdminGuard>
  );
}
