import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, X, FileCode2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function RpcMigrationBanner() {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem("rpc_migration_banner_dismissed") === "true";
  });

  const [isOpen, setIsOpen] = useState(false);

  const handleDismiss = () => {
    localStorage.setItem("rpc_migration_banner_dismissed", "true");
    setDismissed(true);
  };

  if (dismissed) return null;

  const migratedFiles = [
    "src/lib/api/subscriptions.ts",
    "src/lib/api/family.ts",
    "src/lib/api/guardians.ts",
    "src/lib/validation/passwordPolicy.ts",
    "src/components/admin/PasswordPolicyCard.tsx",
  ];

  return (
    <Alert className="border-green-500 bg-green-50">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <AlertTitle className="text-green-900 mb-0">
              RPC Migration Complete
            </AlertTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-auto p-1 text-green-700 hover:text-green-900"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <AlertDescription className="text-green-800 mt-2">
            Security hardening migration successfully applied. All security definer views have been
            converted to RPC functions with proper search_path protection.
          </AlertDescription>

          <div className="mt-3 flex items-center gap-2">
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
              {migratedFiles.length} files updated
            </Badge>
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
              13 security issues resolved
            </Badge>
          </div>

          <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-3">
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <FileCode2 className="h-3 w-3" />
                {isOpen ? "Hide" : "Show"} Updated Files
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="space-y-1 p-3 rounded-lg bg-muted/50">
                <p className="text-xs font-semibold mb-2 text-muted-foreground">
                  New RPC API Wrappers:
                </p>
                {migratedFiles.map((file) => (
                  <div
                    key={file}
                    className="text-xs font-mono text-muted-foreground flex items-center gap-2"
                  >
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                    {file}
                  </div>
                ))}
              </div>

              <div className="mt-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                <p className="text-xs text-yellow-900">
                  <strong>Note:</strong> If you have custom code querying the old views
                  (active_subscriptions_v1, family_members_view, guardian_verification_status_view),
                  update it to use the new RPC wrappers from <code>src/lib/api/*.ts</code>
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </Alert>
  );
}
