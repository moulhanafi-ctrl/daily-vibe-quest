import { useState } from "react";
import { useFeatureFlags, toggleFeatureFlag } from "@/hooks/useFeatureFlags";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, Zap } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const FeatureFlags = () => {
  const { data: flags, isLoading } = useFeatureFlags();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [toggling, setToggling] = useState<string | null>(null);

  const handleToggle = async (flagKey: string, currentValue: boolean) => {
    setToggling(flagKey);
    try {
      await toggleFeatureFlag(flagKey, !currentValue);
      await queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
      toast({
        title: "Flag Updated",
        description: `${flagKey} is now ${!currentValue ? "enabled" : "disabled"}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update feature flag",
        variant: "destructive",
      });
    } finally {
      setToggling(null);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "killswitch":
        return "destructive";
      case "core":
        return "default";
      case "admin":
        return "secondary";
      default:
        return "outline";
    }
  };

  const groupedFlags = flags?.reduce((acc, flag) => {
    if (!acc[flag.category]) acc[flag.category] = [];
    acc[flag.category].push(flag);
    return acc;
  }, {} as Record<string, typeof flags>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const killSwitches = groupedFlags?.["killswitch"] || [];
  const activeKillSwitches = killSwitches.filter((f) => f.enabled);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Feature Flags</h1>
        <p className="text-muted-foreground">
          Control feature rollout and emergency kill switches
        </p>
      </div>

      {activeKillSwitches.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Active Kill Switches</AlertTitle>
          <AlertDescription>
            {activeKillSwitches.map((f) => f.flag_key).join(", ")} are currently enabled
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {Object.entries(groupedFlags || {}).map(([category, categoryFlags]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {category === "killswitch" && <Zap className="h-5 w-5 text-destructive" />}
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </CardTitle>
              <CardDescription>
                {category === "killswitch"
                  ? "Emergency switches to disable features immediately"
                  : `Manage ${category} features`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {categoryFlags.map((flag) => (
                <div
                  key={flag.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={flag.flag_key} className="font-mono text-sm">
                        {flag.flag_key}
                      </Label>
                      <Badge variant={getCategoryColor(flag.category)}>
                        {flag.category}
                      </Badge>
                    </div>
                    {flag.description && (
                      <p className="text-sm text-muted-foreground">{flag.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {toggling === flag.flag_key ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Switch
                        id={flag.flag_key}
                        checked={flag.enabled}
                        onCheckedChange={() => handleToggle(flag.flag_key, flag.enabled)}
                        disabled={toggling !== null}
                      />
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default FeatureFlags;
