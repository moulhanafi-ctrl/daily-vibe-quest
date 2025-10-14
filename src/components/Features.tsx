import { Brain, Users, Sparkles, Shield } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Daily Mood Check-ins",
    description: "Quick emoji-based check-ins to track your emotional journey and spot patterns over time.",
    color: "mint",
  },
  {
    icon: Sparkles,
    title: "Personalized Content",
    description: "AI-driven motivational speeches and coping tips tailored to your specific life struggles.",
    color: "coral",
  },
  {
    icon: Users,
    title: "Family Mode",
    description: "Shared dashboard for families to support each other with age-appropriate content for everyone.",
    color: "lilac",
  },
  {
    icon: Shield,
    title: "Privacy First",
    description: "Encrypted data, crisis resources built-in, and parental consent for minors. Your safety matters.",
    color: "mint",
  },
];

export const Features = () => {
  return (
    <section id="features" className="py-24 px-4 md:px-6 bg-muted/30" aria-labelledby="features-heading">
      <div className="container mx-auto">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 bg-card/80 backdrop-blur px-4 py-2 rounded-full shadow-card border border-primary/20 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Core Features</span>
          </div>
          <h2 id="features-heading" className="text-4xl md:text-5xl font-bold">
            Wellness, but <span className="text-secondary">chill</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to maintain your mental wellness in one safe, friendly space.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <article
                key={index}
                className="gradient-card p-8 rounded-3xl shadow-card hover:shadow-soft transition-smooth group hover:-translate-y-2 animate-fade-in border border-border/50"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="inline-flex p-4 rounded-2xl bg-primary/10 mb-6 group-hover:scale-110 group-hover:rotate-3 transition-smooth">
                  <Icon className="w-8 h-8 text-primary" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-smooth">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
