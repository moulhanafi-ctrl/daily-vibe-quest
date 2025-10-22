import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // 1) Resolve initial session BEFORE subscribing
        const { data: { session: initial } } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(initial);

        // 2) Subscribe AFTER we have a baseline
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_, next) => {
          if (mounted) {
            setSession(next);
          }
        });
        
        unsubRef.current = () => subscription.unsubscribe();
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    // 3) Cleanup
    return () => {
      mounted = false;
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, []);

  return { session, loading, isAuthed: !!session };
}
