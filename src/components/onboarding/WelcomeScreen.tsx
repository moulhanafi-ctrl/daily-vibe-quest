import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface WelcomeScreenProps {
  onNext: () => void;
}

export const WelcomeScreen = ({ onNext }: WelcomeScreenProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-onboarding p-4">
      <Card className="w-full max-w-2xl">
        <CardContent className="pt-8 pb-6 space-y-6">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Welcome to Daily Vibe Check 👋
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Let's get to know your vibe. This helps us personalize stories, motivation, 
              and mental health support that fit you best.
            </p>
          </div>
          
          <div className="flex justify-center pt-4">
            <Button 
              onClick={onNext} 
              size="lg"
              className="px-8"
            >
              Let's Start
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
