import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { QAChecklist } from "@/components/admin/QAChecklist";
import { MonitoringDashboard } from "@/components/admin/MonitoringDashboard";
import { LiveModeStatus } from "@/components/admin/LiveModeStatus";
import { FeatureFlagKillSwitches } from "@/components/admin/FeatureFlagKillSwitches";
import { StripeLiveSetupGuide } from "@/components/admin/StripeLiveSetupGuide";
import { StripeModeToggle } from "@/components/admin/StripeModeToggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PublishReadiness = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Publish Readiness Dashboard</h1>
            <p className="text-muted-foreground">
              Final QA, go-live settings, and day-1 monitoring
            </p>
          </div>
        </div>

        <Tabs defaultValue="qa" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="qa">Phase A - Final QA</TabsTrigger>
            <TabsTrigger value="live">Phase B - Go Live</TabsTrigger>
            <TabsTrigger value="monitor">Phase C - Monitoring</TabsTrigger>
          </TabsList>

          <TabsContent value="qa" className="space-y-6">
            <QAChecklist />
          </TabsContent>

          <TabsContent value="live" className="space-y-6">
            <StripeLiveSetupGuide />
            <LiveModeStatus />
            <StripeModeToggle />
            
            <div className="prose dark:prose-invert max-w-none">
              <h2>Go-Live Checklist</h2>
              <ul>
                <li>
                  <strong>Stripe Live Mode:</strong> Set <code>STRIPE_LIVE_MODE=true</code> and verify webhook endpoint
                </li>
                <li>
                  <strong>Feature Flags:</strong> Enable all production flags via <a href="/admin/flags">/admin/flags</a>
                </li>
                <li>
                  <strong>Smoke Tests:</strong> Test signup → check-in → journal flow in production
                </li>
                <li>
                  <strong>Purchase Test:</strong> Complete 1 live digital item purchase + access verification
                </li>
                <li>
                  <strong>Monitoring:</strong> Verify all analytics events firing with dimensions
                </li>
              </ul>

              <h3>Feature Flags Configuration</h3>
              <p>Enable the following for production:</p>
              <ul>
                <li><code>ff.core=true</code></li>
                <li><code>ff.i18n_core=true</code></li>
                <li><code>ff.lang_en=true</code>, <code>ff.lang_es=true</code>, <code>ff.lang_fr=true</code>, <code>ff.lang_ar=true</code></li>
                <li><code>ff.room_safety=true</code></li>
                <li><code>ff.local_help=true</code></li>
                <li><code>ff.store_pdp_v2=true</code></li>
                <li><code>ff.legal_gate=true</code></li>
                <li><code>ff.email_templates=true</code></li>
              </ul>

              <h3>Kill Switches (Keep Available)</h3>
              <ul>
                <li><code>ff.notifications_pause=false</code> (toggle to pause Mostapha notifications)</li>
                <li><code>ff.store_pdp_v2=false</code> (revert store on issues)</li>
                <li><code>ff.room_safety=false</code> (disable reporting features if abused)</li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="monitor" className="space-y-6">
            <FeatureFlagKillSwitches />
            <MonitoringDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PublishReadiness;
