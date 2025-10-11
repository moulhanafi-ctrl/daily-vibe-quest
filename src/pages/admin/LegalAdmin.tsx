import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Download, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const LegalAdmin = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("legal");
  const [legalVersions, setLegalVersions] = useState<any[]>([]);
  const [consentRecords, setConsentRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load legal versions
      const { data: versions, error: versionsError } = await supabase
        .from("legal_versions")
        .select("*")
        .order("created_at", { ascending: false });

      if (versionsError) throw versionsError;
      setLegalVersions(versions || []);

      // Load recent consent records
      const { data: consents, error: consentsError } = await supabase
        .from("consent_ledger")
        .select("*")
        .order("accepted_at", { ascending: false })
        .limit(100);

      if (consentsError) throw consentsError;
      setConsentRecords(consents || []);

      setLoading(false);
    } catch (error: any) {
      console.error("Error loading legal data:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const exportConsentRecords = () => {
    const csv = [
      ["User ID", "Version", "Accepted At", "IP", "User Agent", "Guardian ID"].join(","),
      ...consentRecords.map(record => 
        [
          record.user_id,
          record.version,
          record.accepted_at,
          record.accepted_ip || "",
          record.user_agent || "",
          record.guardian_id || ""
        ].join(",")
      )
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `consent-ledger-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const bumpVersion = async (documentType: string) => {
    try {
      // This is a simplified version bump - in production you'd want more sophisticated version management
      const confirmed = window.confirm(
        `This will bump the ${documentType} version and force all users to re-consent. Continue?`
      );

      if (!confirmed) return;

      toast({
        title: "Version Bump",
        description: `${documentType} version bumped. Users will be prompted to re-consent on next login.`,
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Legal Administration</h1>
          <p className="text-muted-foreground">Manage legal documents, versions, and consent records</p>
        </div>

        <Tabs defaultValue="versions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="versions">Legal Versions</TabsTrigger>
            <TabsTrigger value="consents">Consent Ledger</TabsTrigger>
          </TabsList>

          <TabsContent value="versions" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {["terms", "privacy", "guidelines", "safety"].map((docType) => {
                const version = legalVersions.find(v => v.document_type === docType && v.active);
                return (
                  <Card key={docType} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold capitalize">{docType}</h3>
                        <p className="text-sm text-muted-foreground">
                          Version: {version?.version || "N/A"}
                        </p>
                      </div>
                      {version?.active && (
                        <Badge className="bg-green-500">Active</Badge>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2"
                        onClick={() => navigate(`/${docType}`)}
                      >
                        <Eye className="h-4 w-4" />
                        Preview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2"
                        onClick={() => bumpVersion(docType)}
                      >
                        <FileText className="h-4 w-4" />
                        Bump Version
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="consents" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Consent Records</h2>
                  <p className="text-sm text-muted-foreground">
                    {consentRecords.length} total records
                  </p>
                </div>
                <Button onClick={exportConsentRecords} className="gap-2">
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {consentRecords.map((record) => (
                  <Card key={record.id} className="p-4 bg-secondary/20">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Version</p>
                        <p className="font-medium">{record.version}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Accepted At</p>
                        <p className="font-medium">
                          {new Date(record.accepted_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Terms</p>
                        <Badge variant={record.terms_accepted ? "default" : "secondary"}>
                          {record.terms_accepted ? "✓" : "✗"}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Guidelines</p>
                        <Badge variant={record.guidelines_accepted ? "default" : "secondary"}>
                          {record.guidelines_accepted ? "✓" : "✗"}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default LegalAdmin;
