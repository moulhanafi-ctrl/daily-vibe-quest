import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const IssueReporter = () => {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [stepsToReproduce, setStepsToReproduce] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // In production, this would create a support ticket
      // For now, we'll log to incidents table
      const { error } = await supabase.from("incidents").insert({
        category: category || "bug_report",
        severity: "medium",
        description: `[User Report]\n\n${description}\n\nSteps to reproduce:\n${stepsToReproduce}`,
        user_id: user?.id || null,
        status: "open",
      });

      if (error) throw error;

      toast({
        title: "Issue reported",
        description: "Thank you! Our team will review your report.",
      });

      setOpen(false);
      setCategory("");
      setDescription("");
      setStepsToReproduce("");
    } catch (error) {
      console.error("Error submitting issue:", error);
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <AlertCircle className="h-4 w-4" />
          Report an Issue
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Report an Issue</DialogTitle>
          <DialogDescription>
            Help us improve by reporting bugs or issues you've encountered.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bug_report">Bug Report</SelectItem>
                <SelectItem value="performance">Performance Issue</SelectItem>
                <SelectItem value="ui_ux">UI/UX Problem</SelectItem>
                <SelectItem value="accessibility">Accessibility Issue</SelectItem>
                <SelectItem value="translation">Translation Error</SelectItem>
                <SelectItem value="feature_request">Feature Request</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue you're experiencing..."
              required
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="steps">Steps to Reproduce</Label>
            <Textarea
              id="steps"
              value={stepsToReproduce}
              onChange={(e) => setStepsToReproduce(e.target.value)}
              placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Additional Information</Label>
            <p className="text-xs text-muted-foreground">
              Browser: {navigator.userAgent}
            </p>
            <p className="text-xs text-muted-foreground">
              Screen: {window.screen.width}x{window.screen.height}
            </p>
            <p className="text-xs text-muted-foreground">
              Language: {navigator.language}
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
