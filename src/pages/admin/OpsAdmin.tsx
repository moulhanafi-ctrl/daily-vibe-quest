import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BackupStatus } from "@/components/admin/BackupStatus";

const OpsAdmin = () => {
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
            <h1 className="text-3xl font-bold">Operations Dashboard</h1>
            <p className="text-muted-foreground">
              Backup status, restore procedures, and system health
            </p>
          </div>
        </div>

        <BackupStatus />

        <div className="prose dark:prose-invert max-w-none">
          <h2>Quick Links</h2>
          <ul>
            <li>
              <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/admin/help-locations")}>
                Help Locations Management
              </Button>
            </li>
            <li>
              <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/admin/zip-tools")}>
                ZIP Code Cache Management
              </Button>
            </li>
            <li>
              <a href="/docs/BACKUPS_AND_RESTORE.md" target="_blank" rel="noopener noreferrer">
                Backup & Restore Documentation
              </a>
            </li>
            <li>
              <a href="/docs/FAMILY_STORIES_SETUP.md" target="_blank" rel="noopener noreferrer">
                Family Stories Setup & Management
              </a>
            </li>
            <li>
              <a href="/docs/STRIPE_LIVE_MODE.md" target="_blank" rel="noopener noreferrer">
                Stripe Live Mode Guide
              </a>
            </li>
            <li>
              <a href="/docs/FEATURE_FLAGS.md" target="_blank" rel="noopener noreferrer">
                Feature Flags Documentation
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default OpsAdmin;
