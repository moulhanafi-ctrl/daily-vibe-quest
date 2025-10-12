import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MapPin } from "lucide-react";

interface ZipCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onZipSaved: (zip: string) => void;
}

export const ZipCodeModal = ({ open, onOpenChange, onZipSaved }: ZipCodeModalProps) => {
  const [zip, setZip] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!/^\d{5}$/.test(zip)) {
      toast.error("Please enter a valid 5-digit ZIP code");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({ 
          location: { zip, consented: true }
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Location saved");
      onZipSaved(zip);
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving ZIP:", error);
      toast.error("Failed to save location");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Find Local Help
          </DialogTitle>
          <DialogDescription>
            Enter your ZIP code to see crisis resources and licensed mental health professionals near you.
            Your location is private and only used to show nearby help.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="zip">ZIP Code</Label>
            <Input
              id="zip"
              placeholder="12345"
              value={zip}
              onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
              maxLength={5}
            />
          </div>
          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? "Saving..." : "Save & Continue"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
