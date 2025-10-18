import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Download, Trash2, Clock, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";

export const DataRights = () => {
  const { t } = useTranslation("legal");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDataExport = async () => {
    setExportLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Insert export request
      const { error } = await supabase
        .from("data_export_requests")
        .insert({
          user_id: user.id,
          status: "pending"
        });

      if (error) throw error;

      trackEvent({ 
        eventType: "data_export_requested" as any,
        metadata: { user_id: user.id }
      });

      toast({
        title: t("dataRights.export.success"),
        description: t("dataRights.export.processing"),
      });
    } catch (error: any) {
      toast({
        title: t("dataRights.export.error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setExportLoading(false);
    }
  };

  const handleAccountDeletion = async () => {
    setDeleteLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      // Call edge function to execute full account deletion
      const { data, error: functionError } = await supabase.functions.invoke(
        'execute-account-deletion',
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        }
      );

      if (functionError) throw functionError;
      if (!data?.success) throw new Error(data?.error || "Deletion failed");

      trackEvent({ 
        eventType: "account_deleted" as any,
        metadata: { user_id: user.id }
      });

      toast({
        title: t("dataRights.delete.success"),
        description: "Your account and all data have been permanently deleted.",
      });

      setShowDeleteDialog(false);

      // Sign out and redirect
      setTimeout(async () => {
        await supabase.auth.signOut();
        window.location.href = '/';
      }, 2000);

    } catch (error: any) {
      toast({
        title: t("dataRights.delete.error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{t("dataRights.title")}</h2>
        <p className="text-muted-foreground">{t("dataRights.subtitle")}</p>
      </div>

      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-500/10 rounded-lg">
            <Download className="h-6 w-6 text-blue-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">{t("dataRights.export.title")}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t("dataRights.export.description")}
            </p>
            <Button
              onClick={handleDataExport}
              disabled={exportLoading}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {exportLoading
                ? t("dataRights.export.pending")
                : t("dataRights.export.button")}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6 border-destructive/50">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-destructive/10 rounded-lg">
            <Trash2 className="h-6 w-6 text-destructive" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">{t("dataRights.delete.title")}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t("dataRights.delete.description")}
            </p>
            <Button
              onClick={() => setShowDeleteDialog(true)}
              variant="destructive"
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {t("dataRights.delete.button")}
            </Button>
          </div>
        </div>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dataRights.delete.confirm")}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>{t("dataRights.delete.warning")}</p>
              <p className="text-sm font-medium text-orange-500">
                {t("dataRights.delete.graceNote", { days: 7 })}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("dataRights.delete.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAccountDeletion}
              disabled={deleteLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteLoading ? t("common:processing", "Processing...") : t("dataRights.delete.proceed")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
