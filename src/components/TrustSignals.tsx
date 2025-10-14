import { Shield, Lock, Heart, Award } from "lucide-react";

const trustItems = [
  {
    icon: Shield,
    title: "HIPAA Compliant",
    description: "Your data is encrypted and secure",
  },
  {
    icon: Lock,
    title: "Privacy First",
    description: "We never sell your personal information",
  },
  {
    icon: Heart,
    title: "Crisis Support",
    description: "24/7 access to crisis resources",
  },
  {
    icon: Award,
    title: "Evidence-Based",
    description: "Built with mental health professionals",
  },
];

export const TrustSignals = () => {
  return (
    <section className="py-16 px-4 md:px-6 border-y border-border/50 bg-card/30">
      <div className="container mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {trustItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="text-center space-y-3 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="inline-flex p-4 rounded-2xl bg-primary/10 mx-auto">
                  <Icon className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
