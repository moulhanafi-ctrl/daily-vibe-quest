import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FeatureFlag {
  id: string;
  flag_key: string;
  enabled: boolean;
  description: string | null;
  category: string;
  created_at: string;
  updated_at: string;
}

export const useFeatureFlags = () => {
  return useQuery({
    queryKey: ["feature-flags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("*")
        .order("category", { ascending: true })
        .order("flag_key", { ascending: true });

      if (error) throw error;
      return data as FeatureFlag[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });
};

export const useFeatureFlag = (flagKey: string): boolean => {
  const { data: flags } = useFeatureFlags();
  const flag = flags?.find((f) => f.flag_key === flagKey);
  return flag?.enabled ?? false;
};

export const toggleFeatureFlag = async (flagKey: string, enabled: boolean) => {
  const { error } = await supabase
    .from("feature_flags")
    .update({ enabled })
    .eq("flag_key", flagKey);

  if (error) throw error;
};
