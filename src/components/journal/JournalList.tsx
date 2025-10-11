import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Calendar, Tag, Lock, Share2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface JournalListProps {
  onSelectEntry: (entry: any) => void;
}

export const JournalList = ({ onSelectEntry }: JournalListProps) => {
  const [entries, setEntries] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEntries();
  }, [searchQuery, selectedTags]);

  const loadEntries = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,body.ilike.%${searchQuery}%,transcript.ilike.%${searchQuery}%`);
      }

      if (selectedTags.length > 0) {
        query = query.overlaps("tags", selectedTags);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEntries(data || []);

      // Extract all unique tags
      const tags = new Set<string>();
      data?.forEach(entry => {
        entry.tags?.forEach((tag: string) => tags.add(tag));
      });
      setAllTags(Array.from(tags));
    } catch (error: any) {
      console.error("Error loading entries:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const getMoodEmoji = (mood: number) => {
    return ["😢", "😕", "😐", "🙂", "😊"][mood - 1] || "😐";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Journal</CardTitle>
        <div className="space-y-3 pt-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleTag(tag)}
                >
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : entries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No entries found. Start journaling!
            </p>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <Card
                  key={entry.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => onSelectEntry(entry)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {entry.mood && (
                          <span className="text-xl">{getMoodEmoji(entry.mood)}</span>
                        )}
                        <div className="flex-1 min-w-0">
                          {entry.title && (
                            <h4 className="font-medium truncate">{entry.title}</h4>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(entry.date), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {entry.shared_with_parent ? (
                          <Share2 className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Lock className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    {entry.body && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {entry.body}
                      </p>
                    )}
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {entry.tags.map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
