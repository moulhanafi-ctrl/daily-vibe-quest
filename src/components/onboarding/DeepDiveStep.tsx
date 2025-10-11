import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface DeepDiveStepProps {
  onNext: (reflection: string) => void;
  onBack: () => void;
}

export const DeepDiveStep = ({ onNext, onBack }: DeepDiveStepProps) => {
  const [reflection, setReflection] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(reflection);
  };

  const handleSkip = () => {
    onNext("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Share Your Story (Optional)</CardTitle>
          <CardDescription>
            Step 3 of 4 • Tell us more about what's been going on
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="reflection">
                Would you like to tell us more?
              </Label>
              <p className="text-sm text-muted-foreground mb-2">
                There's no wrong answer. This helps us understand your journey better.
              </p>
              <Textarea
                id="reflection"
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="Share what's on your mind..."
                className="min-h-[150px] resize-none"
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground text-right">
                {reflection.length}/200 characters
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onBack} className="flex-1">
                Back
              </Button>
              <Button type="button" variant="ghost" onClick={handleSkip} className="flex-1">
                Skip
              </Button>
              <Button type="submit" className="flex-1">
                Continue
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
