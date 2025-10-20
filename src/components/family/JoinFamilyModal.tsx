import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const formSchema = z.object({
  inviteCode: z.string()
    .min(6, "Invite code must be at least 6 characters")
    .max(8, "Invite code must be at most 8 characters")
    .regex(/^[A-Z0-9]+$/, "Invite code can only contain uppercase letters and numbers"),
});

interface JoinFamilyModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const JoinFamilyModal = ({ open, onClose, onSuccess }: JoinFamilyModalProps) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      inviteCode: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("join_family_via_code", {
        _invite_code: values.inviteCode.toUpperCase().trim(),
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message?: string };

      if (!result.success) {
        toast({
          title: "Unable to join",
          description: result.error || "Invalid invite code",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "✅ Success!",
        description: result.message || "You've joined the family group",
      });

      form.reset();
      onClose();
      
      if (onSuccess) {
        onSuccess();
      } else {
        // Navigate to family chat after short delay
        setTimeout(() => {
          navigate("/family/chat");
        }, 1000);
      }
    } catch (error: any) {
      console.error("Error joining family:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to join family group",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Join Family Group
          </DialogTitle>
          <DialogDescription>
            Enter the invite code shared by a family member to join their group
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="inviteCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invite Code *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., ABC12345" 
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      className="text-center text-xl font-mono font-bold tracking-wider"
                      maxLength={8}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    The code is 6-8 characters (letters and numbers)
                  </p>
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  "Join Group"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
