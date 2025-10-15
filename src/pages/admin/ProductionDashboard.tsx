import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ProductionReadinessChecklist } from "@/components/admin/ProductionReadinessChecklist";
import { MFASettings } from "@/components/settings/MFASettings";
import { StripeLiveModeVerification } from "@/components/admin/StripeLiveModeVerification";

const ProductionDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-xl font-bold">Production Readiness</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold">🚀 Go Live Checklist</h2>
          <p className="text-muted-foreground">
            Complete these final steps to activate your production environment with full security.
          </p>
        </div>

        <ProductionReadinessChecklist />

        <div className="grid md:grid-cols-2 gap-6">
          <MFASettings />
          <StripeLiveModeVerification />
        </div>

        <div className="pt-6 border-t">
          <h3 className="text-xl font-semibold mb-4">📚 Documentation</h3>
          <div className="grid gap-3">
            <Button variant="outline" className="justify-start" asChild>
              <a href="/docs/STRIPE_LIVE_MODE.md" target="_blank">
                📄 Stripe Live Mode Guide
              </a>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <a href="/docs/FINAL_QA_AND_LAUNCH.md" target="_blank">
                📄 Final QA & Launch Checklist
              </a>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <a href="/docs/LAUNCH_SUMMARY.md" target="_blank">
                📄 Launch Summary
              </a>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProductionDashboard;
