import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function SecurityAuditSummary() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Security Hardening Complete
          </CardTitle>
          <CardDescription>
            All SECURITY DEFINER functions hardened with proper search_path and minimal grants
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <div>
                <div className="font-medium">Search Path Locked</div>
                <div className="text-sm text-muted-foreground">
                  All functions use <code className="px-1 py-0.5 bg-muted rounded text-xs">SET search_path = pg_temp, public</code> to prevent injection attacks
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <div>
                <div className="font-medium">Minimal Privileges</div>
                <div className="text-sm text-muted-foreground">
                  <code className="px-1 py-0.5 bg-muted rounded text-xs">REVOKE ALL ... FROM public</code> + 
                  <code className="px-1 py-0.5 bg-muted rounded text-xs ml-1">GRANT EXECUTE TO authenticated</code> only
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <div>
                <div className="font-medium">Input Validation</div>
                <div className="text-sm text-muted-foreground">
                  Trigger functions include null checks and data sanitization
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <div>
                <div className="font-medium">RLS Enabled</div>
                <div className="text-sm text-muted-foreground">
                  Row-Level Security active on all tables (user_roles, profiles, push_subscriptions)
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            False Positive Warnings (Safe to Ignore)
          </CardTitle>
          <CardDescription>
            Linter warnings that are not security risks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900 dark:text-green-100">
              <strong>✅ Security Hardening Complete:</strong> All security definer views converted to 
              RPC functions with explicit search_path. Type-safe API wrappers now available.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
              <Badge variant="outline" className="mt-0.5 shrink-0 bg-green-100 text-green-800 border-green-300">Fixed</Badge>
              <div className="flex-1">
                <div className="font-medium font-mono text-sm">get_active_subscriptions_v1()</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Replaced view with SECURITY DEFINER function. Proper search_path and schema qualification.
                </div>
                <code className="text-xs mt-2 block text-muted-foreground">
                  import &#123; getActiveSubscriptions &#125; from '@/lib/api/subscriptions'
                </code>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
              <Badge variant="outline" className="mt-0.5 shrink-0 bg-green-100 text-green-800 border-green-300">Fixed</Badge>
              <div className="flex-1">
                <div className="font-medium font-mono text-sm">get_family_members_view()</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Replaced view with parameterized function. Explicit schema qualification.
                </div>
                <code className="text-xs mt-2 block text-muted-foreground">
                  import &#123; getFamilyMembers &#125; from '@/lib/api/family'
                </code>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
              <Badge variant="outline" className="mt-0.5 shrink-0 bg-green-100 text-green-800 border-green-300">Fixed</Badge>
              <div className="flex-1">
                <div className="font-medium font-mono text-sm">get_guardian_verification_status()</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Replaced view with secure function. Protected guardian email privacy maintained.
                </div>
                <code className="text-xs mt-2 block text-muted-foreground">
                  import &#123; getGuardianVerificationStatus &#125; from '@/lib/api/guardians'
                </code>
              </div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground pt-3 border-t">
            <strong>Migration Complete:</strong> All RPC functions use <code className="px-1 bg-muted rounded">SET search_path = public</code> 
            and explicit schema qualification (<code className="px-1 bg-muted rounded">public.table_name</code>). 
            CI checks prevent regression to insecure patterns.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            Manual Step Required: Password Protection
          </CardTitle>
          <CardDescription>
            Enable leaked password detection in backend settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-900 dark:text-amber-100">
              Password leak protection must be enabled manually in the backend. 
              This cannot be automated via API.
            </AlertDescription>
          </Alert>

          <div className="mt-4 space-y-2 text-sm">
            <div className="font-medium">Required Settings:</div>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2">
              <li>Navigate to Authentication → Policies → Password</li>
              <li>Enable <strong>Leaked Password Protection</strong> → Set to <strong>Block</strong></li>
              <li>Set <strong>Minimum Characters</strong>: 12</li>
              <li>Enable <strong>Require Numbers</strong></li>
              <li>Enable <strong>Require Symbols</strong></li>
            </ul>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm">
            <div className="font-medium mb-2">Test Verification:</div>
            <code className="text-xs block">
              Attempt signup with "Password123!" → Should be blocked ✓
            </code>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hardened Functions (8 total)</CardTitle>
          <CardDescription>All public schema SECURITY DEFINER functions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-2 text-sm font-mono">
            {[
              'has_role(uuid, app_role)',
              'has_admin_role(uuid, admin_role)',
              'can_view_profile(uuid, uuid)',
              'is_parent(uuid)',
              'is_parent_of(uuid, uuid)',
              'handle_new_user() [trigger]',
              'update_last_login() [trigger]',
              'update_push_subscriptions_updated_at() [trigger]'
            ].map((fn) => (
              <div key={fn} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                <CheckCircle className="h-3 w-3 text-green-600 shrink-0" />
                <span className="text-xs truncate">{fn}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
