import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProfileFieldsFormProps {
  userId: string | null;
}

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Detroit",
];

export function ProfileFieldsForm({ userId }: ProfileFieldsFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [timezone, setTimezone] = useState("America/Detroit");

  const { data: profile } = useQuery({
    queryKey: ["profile-fields", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, birth_date, timezone")
        .eq("id", userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setBirthDate(profile.birth_date || "");
      setTimezone(profile.timezone || "America/Detroit");
    }
  }, [profile]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("No user ID");
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          birth_date: birthDate || null,
          timezone,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Profile updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["profile-fields", userId] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="fullName">Full Name</Label>
        <Input
          id="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Enter your full name"
        />
      </div>

      <div>
        <Label htmlFor="birthDate">Birth Date</Label>
        <Input
          id="birthDate"
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          max={new Date().toISOString().split("T")[0]}
        />
        <p className="text-sm text-muted-foreground mt-1">
          Used for birthday notifications (optional)
        </p>
      </div>

      <div>
        <Label htmlFor="timezone">Timezone</Label>
        <Select value={timezone} onValueChange={setTimezone}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz} value={tz}>
                {tz.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={() => updateProfile.mutate()}
        disabled={updateProfile.isPending}
      >
        {updateProfile.isPending ? "Saving..." : "Save Profile"}
      </Button>
    </div>
  );
}