import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertCircle } from "lucide-react";

interface AdminGuideProps {
  onCommandClick: (command: string) => void;
}

export const AdminGuide = ({ onCommandClick }: AdminGuideProps) => {
  const commands = [
    {
      type: "read" as const,
      title: "List Incidents",
      command: "Show me open incidents from the last 24 hours",
      description: '"Show me open incidents" or "List high severity incidents from the last 24h"',
    },
    {
      type: "read" as const,
      title: "Summarize Room",
      command: "Summarize activity in the top chat rooms for the last 24h",
      description: '"Summarize activity in room [room-id] for the last 24h"',
    },
    {
      type: "approve" as const,
      title: "Take Action",
      command: "What actions should I take for recent incidents?",
      description: '"Warn user [user-id] for harassment" or "Mute user [user-id] for 24 hours"',
    },
    {
      type: "approve" as const,
      title: "Send Message",
      command: "Draft a community update about guidelines",
      description: '"Send a message to user [user-id] about community guidelines"',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Admin Tools Guide
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {commands.map((cmd, index) => (
            <div key={index} className="flex items-start gap-3">
              <Button
                type="button"
                size="sm"
                variant={cmd.type === "read" ? "outline" : "default"}
                className={`mt-1 min-w-[80px] pointer-events-auto cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                  cmd.type === "approve"
                    ? "bg-amber-500 hover:bg-amber-600 text-white"
                    : ""
                }`}
                onClick={() => onCommandClick(cmd.command)}
                aria-label={`Run command: ${cmd.title}`}
              >
                {cmd.type === "read" ? "Read" : "Approve"}
              </Button>
              <div className="flex-1">
                <p className="text-sm font-semibold mb-1">{cmd.title}</p>
                <p className="text-xs text-muted-foreground">{cmd.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-3">
          <div className="flex gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-200">
              All actions requiring approval will appear in the Action Plan panel on the right. 
              Review carefully before executing—all actions are logged for audit.
            </p>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <p className="text-xs font-semibold">Available Actions:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="text-xs">warn</Badge>
              <span className="text-muted-foreground">Warning message</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="text-xs">mute</Badge>
              <span className="text-muted-foreground">Temp mute (hours)</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="text-xs">suspend</Badge>
              <span className="text-muted-foreground">Temp ban (days)</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="destructive" className="text-xs">ban</Badge>
              <span className="text-muted-foreground">Permanent ban</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
