import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";

export function PasswordPolicyCard() {
  return (
    <Card className="border-warning">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-warning" />
            <CardTitle>Password Security Policy</CardTitle>
          </div>
          <Badge variant="destructive">ACTION REQUIRED</Badge>
        </div>
        <CardDescription>
          Strengthen authentication security with leaked password protection
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Leaked Password Protection: DISABLED</strong>
            <p className="mt-2 text-sm">
              Users can currently set passwords from known breach databases. Enable this protection
              to prevent compromised passwords from being used.
            </p>
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Manual Configuration Required</h4>
          <p className="text-sm text-muted-foreground">
            Follow these steps in Supabase Auth settings to enable leaked password protection:
          </p>

          <ol className="text-sm space-y-2 ml-4 list-decimal">
            <li>
              Open Supabase Dashboard → Authentication → Policies
            </li>
            <li>
              Scroll to "Password" section
            </li>
            <li>
              Enable <strong>"Check passwords against known breaches"</strong>
            </li>
            <li>
              Configure password complexity requirements:
              <ul className="mt-2 ml-4 space-y-1 list-disc text-muted-foreground">
                <li>Minimum length: <strong>12 characters</strong></li>
                <li>Require: 1 uppercase, 1 lowercase, 1 number, 1 symbol</li>
                <li>Enable lockout after <strong>5 failed attempts</strong></li>
                <li>Set backoff: 5 min → 15 min → 1 hour (exponential)</li>
              </ul>
            </li>
          </ol>

          <Button 
            variant="default" 
            className="w-full mt-4"
            onClick={() => window.open('https://supabase.com/dashboard/project', '_blank')}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Open Supabase Dashboard
          </Button>
        </div>

        <div className="space-y-2 pt-4 border-t">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Already Implemented (Client-Side)
          </h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>✅ Client-side validation: min 12 chars, complexity requirements</li>
            <li>✅ Helpful error messages for password strength</li>
            <li>✅ Rate limiting on sign-in API</li>
            <li>✅ Auto-confirm email enabled for development</li>
          </ul>
        </div>

        <Alert>
          <AlertDescription className="text-xs">
            <strong>Security Note:</strong> Client-side validation provides user feedback but server-side
            enforcement (Supabase Auth settings) is required to prevent bypassing via API calls.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
