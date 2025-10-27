import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let mounted = true;

    // Safety: ensure loading can't hang forever
    const safetyTimeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 7000);

    // 1) Subscribe FIRST to avoid missing events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, next) => {
      if (!mounted) return;
      setSession(next);
    });
    unsubRef.current = () => subscription.unsubscribe();

    // 2) THEN resolve initial session
    supabase.auth.getSession()
      .then(({ data: { session: initial } }) => {
        if (!mounted) return;
        setSession(initial);
      })
      .finally(() => {
        if (mounted) setLoading(false);
        clearTimeout(safetyTimeout);
      });

    // 3) Cleanup
    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, []);

  return { session, loading, isAuthed: !!session };
}
