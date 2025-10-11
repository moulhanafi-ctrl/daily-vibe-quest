import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const familyMembers = [
  { name: "Mom", vibe: "Great", color: "bg-mint" },
  { name: "Dad", vibe: "Good", color: "bg-mint" },
  { name: "Sarah (14)", vibe: "Okay", color: "bg-lilac" },
  { name: "Jake (8)", vibe: "Great", color: "bg-mint" },
];

export const FamilyMode = () => {
  const navigate = useNavigate();

  const handleTryFamilyMode = () => {
    navigate("/dashboard");
  };

  return (
    <section className="py-24 px-4 md:px-6 gradient-hero">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-card/80 backdrop-blur px-4 py-2 rounded-full shadow-card">
              <Heart className="w-4 h-4 text-coral" />
              <span className="text-sm font-medium">Family Mode</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold">
              Support each other's <span className="text-accent">journey</span>
            </h2>
            
            <p className="text-xl text-muted-foreground">
              Share a family dashboard with age-appropriate content for kids, teens, and adults. 
              See everyone's vibe at a glance and support each other through life's ups and downs.
            </p>

            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                  <span className="text-primary text-xs">✓</span>
                </div>
                <span>Illustrated story time for kids (5-10)</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                  <span className="text-primary text-xs">✓</span>
                </div>
                <span>Real stories and coping challenges for teens (11-16)</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                  <span className="text-primary text-xs">✓</span>
                </div>
                <span>Motivational audio and journaling for adults</span>
              </li>
            </ul>

            <Button variant="hero" size="lg" onClick={handleTryFamilyMode}>
              Try Family Mode
            </Button>
          </div>

          <div className="gradient-card p-8 rounded-3xl shadow-soft">
            <h3 className="text-2xl font-bold mb-6 text-center">Today's Family Vibes</h3>
            <div className="space-y-4">
              {familyMembers.map((member, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-background/50 rounded-2xl shadow-card transition-smooth hover:shadow-soft"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 ${member.color} rounded-full flex items-center justify-center text-white font-bold`}>
                      {member.name[0]}
                    </div>
                    <span className="font-medium">{member.name}</span>
                  </div>
                  <div className="text-right">
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${member.color} text-white`}>
                      {member.vibe}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-accent/10 rounded-2xl border border-accent/20">
              <p className="text-sm text-center">
                <span className="font-semibold">Family Reflection:</span> This week, share one thing you're grateful for at dinner.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
