import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Play } from "lucide-react";

interface MotivationalContentProps {
  ageGroup: "child" | "teen" | "adult";
}

export const MotivationalContent = ({ ageGroup }: MotivationalContentProps) => {
  const [content, setContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent();
  }, [ageGroup]);

  const loadContent = async () => {
    try {
      const { data, error } = await supabase
        .from("motivational_content")
        .select("*")
        .or(`age_group.eq.${ageGroup},age_group.is.null`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setContent(data || []);
    } catch (error) {
      console.error("Error loading content:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" />
          Motivational Content
        </CardTitle>
        <CardDescription>
          Personalized content to support your wellness journey
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content.length === 0 ? (
          <div className="text-center py-8">
            <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              No content available yet. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {content.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                      <div className="flex gap-2 mt-2">
                        {item.content_type && (
                          <Badge variant="secondary">{item.content_type}</Badge>
                        )}
                        {item.target_mood && (
                          <Badge variant="outline" className="capitalize">
                            {item.target_mood}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {item.audio_url && (
                      <Button size="sm" variant="outline">
                        <Play className="h-4 w-4 mr-2" />
                        Play
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.content}</p>
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {item.tags.map((tag: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
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
      </CardContent>
    </Card>
  );
};
