import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";

interface ZipCodeModalProps {
  onSave: (zip: string) => void;
}

export const ZipCodeModal = ({ onSave }: ZipCodeModalProps) => {
  const [zip, setZip] = useState("");

  const handleSave = () => {
    const trimmed = zip.trim();
    const isUSZip = /^\d{5}(?:-\d{4})?$/.test(trimmed);
    const isCAPostal = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/i.test(trimmed);
    
    if (!isUSZip && !isCAPostal) {
      return;
    }

    onSave(trimmed.toUpperCase());
  };

  return (
    <div className="flex gap-2">
      <Input
        value={zip}
        onChange={(e) => setZip(e.target.value.toUpperCase())}
        placeholder="12345 or A1A 1A1"
        maxLength={10}
        inputMode="text"
        aria-label="ZIP or Postal Code"
      />
      <Button onClick={handleSave} disabled={!zip}>
        <MapPin className="h-4 w-4 mr-2" />
        Search
      </Button>
    </div>
  );
};
