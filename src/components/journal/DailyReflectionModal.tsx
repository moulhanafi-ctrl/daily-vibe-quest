import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DailyReflectionModalProps {
  onSelectPrompt: (prompt: string) => void;
}

export const DailyReflectionModal = ({ onSelectPrompt }: DailyReflectionModalProps) => {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkAndShowModal();
  }, []);

  const checkAndShowModal = async () => {
    // Check if modal was shown today
    const lastShown = localStorage.getItem('dailyReflectionLastShown');
    const today = new Date().toDateString();
    
    if (lastShown === today) {
      return; // Already shown today
    }

    // Load AI-generated prompt
    await loadDailyPrompt();
  };

  const loadDailyPrompt = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-daily-reflection');

      if (error) throw error;

      if (data?.prompt) {
        setPrompt(data.prompt);
        setOpen(true);
        localStorage.setItem('dailyReflectionLastShown', new Date().toDateString());
      }
    } catch (error: any) {
      console.error('Error loading daily reflection:', error);
      // Don't show error toast, just silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleUsePrompt = () => {
    onSelectPrompt(prompt);
    setOpen(false);
  };

  const handleDismiss = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Today's Reflection
          </DialogTitle>
          <DialogDescription>
            A personalized prompt just for you, based on your recent wellness journey
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-sm text-muted-foreground">Generating your prompt...</p>
          </div>
        ) : (
          <>
            <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
              <p className="text-sm leading-relaxed">{prompt}</p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleDismiss}>
                Maybe Later
              </Button>
              <Button onClick={handleUsePrompt}>
                <Sparkles className="w-4 h-4 mr-2" />
                Start Writing
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
