import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Book, Calendar, Lock } from "lucide-react";
import { format } from "date-fns";

interface ChildProfile {
  id: string;
  username: string;
  age_group: string;
}

interface JournalEntry {
  id: string;
  user_id: string;
  title: string | null;
  body: string | null;
  date: string;
  created_at: string;
  mood: number | null;
  tags: string[];
  visibility?: string;
  audio_url?: string;
  transcript?: string;
  shared_with_parent?: boolean;
}

export default function ParentJournalViewer() {
  const navigate = useNavigate();
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [selectedJournal, setSelectedJournal] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [isParent, setIsParent] = useState(false);

  useEffect(() => {
    checkParentStatus();
  }, []);

  useEffect(() => {
    if (selectedChild) {
      loadJournals(selectedChild);
    }
  }, [selectedChild]);

  const checkParentStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_parent")
        .eq("id", user.id)
        .single();

      if (!profile?.is_parent) {
        toast.error("Access denied. Parent verification required.");
        navigate("/family/members");
        return;
      }

      setIsParent(true);
      await loadChildren(user.id);
    } catch (error) {
      console.error("Error checking parent status:", error);
      toast.error("Failed to verify parent status");
    } finally {
      setLoading(false);
    }
  };

  const loadChildren = async (parentId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, age_group")
        .eq("parent_id", parentId)
        .in("age_group", ["child", "teen"])
        .order("username");

      if (error) throw error;

      setChildren(data || []);
      if (data && data.length > 0) {
        setSelectedChild(data[0].id);
      }
    } catch (error) {
      console.error("Error loading children:", error);
      toast.error("Failed to load linked children");
    }
  };

  const loadJournals = async (childId: string) => {
    try {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", childId)
        .order("date", { ascending: false });

      if (error) throw error;

      // Type assertion since visibility column exists but types haven't regenerated
      setJournals((data as unknown) as JournalEntry[]);
      setSelectedJournal(null);
    } catch (error) {
      console.error("Error loading journals:", error);
      toast.error("Failed to load journals");
    }
  };

  const handleViewJournal = async (journal: JournalEntry) => {
    setSelectedJournal(journal);

    // Log access for audit trail (direct insert since types not regenerated yet)
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from("journal_access_logs" as any)
          .insert({
            user_id: user.id,
            journal_id: journal.id,
            action: "view"
          });
        
        if (error) console.error("Error logging access:", error);
      }
    } catch (error) {
      console.error("Error logging access:", error);
    }
  };

  const getChildInitials = (username: string) => {
    return username
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isParent) {
    return null;
  }

  if (children.length === 0) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="container mx-auto max-w-4xl">
          <Button variant="ghost" onClick={() => navigate("/family/members")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Family
          </Button>
          <Card>
            <CardContent className="py-12 text-center">
              <Book className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Linked Children</h2>
              <p className="text-muted-foreground mb-4">
                Add your child to view their journals.
              </p>
              <Button onClick={() => navigate("/family/members")}>
                Go to Family Members
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/family/members")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Family
          </Button>
          <h1 className="text-3xl font-bold">Children's Journals</h1>
          <p className="text-muted-foreground mt-2">
            View your child's private journal entries (read-only)
          </p>
        </div>

        <div className="grid md:grid-cols-[250px_1fr] gap-6">
          {/* Child Selector */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-lg">Your Children</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => setSelectedChild(child.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    selectedChild === child.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <Avatar>
                    <AvatarFallback>{getChildInitials(child.username)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="font-medium">{child.username}</p>
                    <p className="text-xs opacity-70 capitalize">{child.age_group}</p>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Journal List & Viewer */}
          <div className="grid md:grid-cols-[1fr_1.5fr] gap-6">
            {/* Journal List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Journal Entries</CardTitle>
                <CardDescription>
                  {journals.length} {journals.length === 1 ? "entry" : "entries"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  {journals.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No journal entries yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {journals.map((journal) => (
                        <button
                          key={journal.id}
                          onClick={() => handleViewJournal(journal)}
                          className={`w-full text-left p-3 rounded-lg transition-colors ${
                            selectedJournal?.id === journal.id
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {journal.title || "Untitled Entry"}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Calendar className="h-3 w-3 opacity-70" />
                                <p className="text-xs opacity-70">
                                  {format(new Date(journal.date), "MMM d, yyyy")}
                                </p>
                              </div>
                            </div>
                            <Lock className="h-4 w-4 opacity-50 shrink-0" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Journal Detail Viewer */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {selectedJournal ? "Entry Details" : "Select an Entry"}
                  </CardTitle>
                  {selectedJournal && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Private
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {selectedJournal ? (
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-2xl font-bold mb-2">
                          {selectedJournal.title || "Untitled Entry"}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(selectedJournal.date), "EEEE, MMMM d, yyyy")}
                        </p>
                      </div>

                      <Separator />

                      <div className="prose prose-sm max-w-none">
                        <p className="whitespace-pre-wrap">
                          {selectedJournal.body || "No content"}
                        </p>
                      </div>

                      {selectedJournal.tags && selectedJournal.tags.length > 0 && (
                        <>
                          <Separator />
                          <div>
                            <p className="text-sm font-medium mb-2">Tags</p>
                            <div className="flex flex-wrap gap-2">
                              {selectedJournal.tags.map((tag, idx) => (
                                <Badge key={idx} variant="outline">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      <Separator />

                      <div className="bg-muted p-4 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Lock className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">Privacy Notice</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              This journal is private. Only the owner and verified parent/guardian can view it. You have read-only access.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="h-[600px] flex items-center justify-center text-center text-muted-foreground">
                    <div>
                      <Book className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Select a journal entry to view</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
