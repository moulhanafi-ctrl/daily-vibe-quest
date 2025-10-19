import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, AlertCircle } from "lucide-react";

interface ZipCodeModalProps {
  onSave: (zip: string) => void;
}

export const ZipCodeModal = ({ onSave }: ZipCodeModalProps) => {
  const [zip, setZip] = useState("");
  const [error, setError] = useState("");

  const handleSave = () => {
    const trimmed = zip.trim();
    const isUSZip = /^\d{5}(?:-\d{4})?$/.test(trimmed);
    const isCAPostal = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/i.test(trimmed);
    
    if (!isUSZip && !isCAPostal) {
      setError("Please enter a valid US ZIP code (12345) or Canadian postal code (A1A 1A1)");
      return;
    }

    setError("");
    onSave(trimmed.toUpperCase());
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setZip(e.target.value.toUpperCase());
    if (error) setError("");
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={zip}
          onChange={handleChange}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="12345 or A1A 1A1"
          maxLength={10}
          inputMode="text"
          aria-label="ZIP or Postal Code"
          className={error ? "border-destructive" : ""}
        />
        <Button onClick={handleSave} disabled={!zip}>
          <MapPin className="h-4 w-4 mr-2" />
          Search
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  );
};
