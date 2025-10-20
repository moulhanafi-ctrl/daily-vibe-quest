import { CrisisBanner } from "@/components/help/CrisisBanner";
import LocalHelpSearch from "@/components/help/LocalHelpSearch";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";

export default function HelpNearby() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <CrisisBanner />
      <div className="container mx-auto px-4 py-8 max-w-7xl pb-8 overflow-x-hidden">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              ← Back
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate("/help/test-google")}
            >
              <Settings className="h-4 w-4 mr-2" />
              API Diagnostics
            </Button>
          </div>
          <h1 className="text-3xl font-bold">Local Help Directory</h1>
          <p className="text-muted-foreground mt-2">
            Find crisis centers, top-rated facilities, and open locations near you
          </p>
        </div>
        
        <LocalHelpSearch />
      </div>
    </div>
  );
}
