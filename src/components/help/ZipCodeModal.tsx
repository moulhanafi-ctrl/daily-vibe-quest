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
    // Support both US ZIP codes (12345 or 12345-6789) and Canadian postal codes (A1A 1A1)
    const trimmed = zip.trim();
    const isUSZip = /^\d{5}(?:-\d{4})?$/.test(trimmed);
    const isCAPostal = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/i.test(trimmed);
    
    if (!isUSZip && !isCAPostal) {
      toast.error("Please enter a valid US ZIP code (12345) or Canadian postal code (A1A 1A1)");
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
            Enter your ZIP code (US) or postal code (Canada) to see crisis resources and licensed mental health professionals near you.
            Your location is private and only used to show nearby help.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="zip">ZIP / Postal Code</Label>
            <Input
              id="zip"
              placeholder="12345 or A1A 1A1"
              value={zip}
              onChange={(e) => setZip(e.target.value.toUpperCase().slice(0, 10))}
              maxLength={10}
              inputMode="text"
              aria-label="ZIP or Postal Code"
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
