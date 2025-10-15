import { CrisisBanner } from "@/components/help/CrisisBanner";
import LocalHelpSearch from "@/components/help/LocalHelpSearch";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function HelpNearby() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <CrisisBanner />
      <div className="container mx-auto px-4 py-8 max-w-7xl pb-8 overflow-x-hidden">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
            ← Back
          </Button>
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
