import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, MessageSquare, BarChart3, AlertCircle } from "lucide-react";

export const AdminGuide = () => {
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
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="mt-1">Read</Badge>
            <div className="flex-1">
              <p className="text-sm font-semibold mb-1">List Incidents</p>
              <p className="text-xs text-muted-foreground">
                "Show me open incidents" or "List high severity incidents from the last 24h"
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Badge variant="outline" className="mt-1">Read</Badge>
            <div className="flex-1">
              <p className="text-sm font-semibold mb-1">Summarize Room</p>
              <p className="text-xs text-muted-foreground">
                "Summarize activity in room [room-id] for the last 24h"
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Badge className="mt-1 bg-amber-500">Approve</Badge>
            <div className="flex-1">
              <p className="text-sm font-semibold mb-1">Take Action</p>
              <p className="text-xs text-muted-foreground">
                "Warn user [user-id] for harassment" or "Mute user [user-id] for 24 hours"
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Badge className="mt-1 bg-amber-500">Approve</Badge>
            <div className="flex-1">
              <p className="text-sm font-semibold mb-1">Send Message</p>
              <p className="text-xs text-muted-foreground">
                "Send a message to user [user-id] about community guidelines"
              </p>
            </div>
          </div>
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
