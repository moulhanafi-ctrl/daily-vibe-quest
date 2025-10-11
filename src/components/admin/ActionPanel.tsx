import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";

interface ActionPanelProps {
  pendingAction: any;
  onActionComplete: () => void;
}

export const ActionPanel = ({ pendingAction, onActionComplete }: ActionPanelProps) => {
  const { toast } = useToast();
  const [isExecuting, setIsExecuting] = useState(false);

  const executeAction = async () => {
    if (!pendingAction) return;

    setIsExecuting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-ai-chat", {
        body: {
          executeAction: {
            actionType: pendingAction.actionType,
            plan: pendingAction.plan,
            auditId: pendingAction.auditData?.auditId,
          },
        },
      });

      if (error) throw error;

      toast({
        title: "Action Executed",
        description: data.message || "The action was successfully executed.",
      });

      onActionComplete();
    } catch (error: any) {
      console.error("Execution error:", error);
      toast({
        title: "Execution Failed",
        description: error.message || "Failed to execute action.",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const rejectAction = () => {
    toast({
      title: "Action Rejected",
      description: "The proposed action was rejected.",
    });
    onActionComplete();
  };

  if (!pendingAction) {
    return (
      <Card className="h-[calc(100vh-250px)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Action Plan
          </CardTitle>
          <CardDescription>
            Proposed actions will appear here for approval
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[calc(100%-100px)] text-center">
          <div className="text-muted-foreground">
            <p className="text-sm">No pending actions</p>
            <p className="text-xs mt-2">
              Ask VibeOps to propose a moderation action or send a message
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { actionType, plan } = pendingAction;

  return (
    <Card className="h-[calc(100vh-250px)]">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Requires Approval
        </CardTitle>
        <CardDescription>Review and approve the proposed action</CardDescription>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Action Type Badge */}
        <div>
          <Badge variant="outline" className="text-sm">
            {actionType === "moderation" ? "🛡️ Moderation Action" : "💬 User Message"}
          </Badge>
        </div>

        {/* Moderation Action Details */}
        {actionType === "moderation" && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-muted-foreground">Target User</label>
              <p className="text-base font-medium">{plan.targetUsername}</p>
              <p className="text-xs text-muted-foreground font-mono">{plan.targetUserId}</p>
            </div>

            <Separator />

            <div>
              <label className="text-sm font-semibold text-muted-foreground">Action</label>
              <p className="text-lg font-bold capitalize">{plan.action}</p>
              {plan.durationHours && (
                <p className="text-sm text-muted-foreground">Duration: {plan.durationHours} hours</p>
              )}
              {plan.expiresAt && (
                <p className="text-xs text-muted-foreground">
                  Expires: {new Date(plan.expiresAt).toLocaleString()}
                </p>
              )}
            </div>

            <Separator />

            <div>
              <label className="text-sm font-semibold text-muted-foreground">Reason</label>
              <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">{plan.reason}</p>
            </div>

            {plan.messageId && (
              <>
                <Separator />
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">Related Message</label>
                  <p className="text-xs font-mono text-muted-foreground">{plan.messageId}</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Message Action Details */}
        {actionType === "message" && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-muted-foreground">Recipient</label>
              <p className="text-base font-medium">{plan.targetUsername}</p>
            </div>

            <Separator />

            <div>
              <label className="text-sm font-semibold text-muted-foreground">Message</label>
              <div className="bg-muted p-4 rounded-md">
                <p className="text-sm whitespace-pre-wrap">{plan.message}</p>
              </div>
            </div>

            {plan.templateId && (
              <>
                <Separator />
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">Template</label>
                  <p className="text-xs text-muted-foreground">{plan.templateId}</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-4">
          <Button
            onClick={executeAction}
            disabled={isExecuting}
            className="w-full"
            size="lg"
          >
            {isExecuting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Approve & Execute
              </>
            )}
          </Button>

          <Button
            onClick={rejectAction}
            disabled={isExecuting}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <XCircle className="mr-2 h-4 w-4" />
            Reject
          </Button>
        </div>

        {/* Warning Notice */}
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-3">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            ⚠️ This action will be logged in the audit trail. Make sure you've reviewed all details carefully.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};