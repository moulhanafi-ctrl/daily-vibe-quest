import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Individual",
    price: "4.99",
    description: "Perfect for personal mental wellness",
    features: [
      "Daily mood check-ins",
      "Personalized motivational content",
      "AI-driven notifications",
      "Progress tracking",
      "Crisis resources",
      "Mobile app access",
    ],
    highlighted: false,
  },
  {
    name: "Family",
    price: "11.99",
    description: "For families supporting each other",
    features: [
      "Everything in Individual",
      "Up to 4 family members",
      "Shared family dashboard",
      "Age-appropriate content",
      "Weekly family reflections",
      "Parental controls",
      "Priority support",
    ],
    highlighted: true,
  },
];

export const Pricing = () => {
  return (
    <section className="py-24 px-4 md:px-6">
      <div className="container mx-auto">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl md:text-5xl font-bold">
            Simple, transparent <span className="text-primary">pricing</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that works for you. Cancel anytime, no questions asked.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`gradient-card p-8 rounded-3xl transition-smooth ${
                plan.highlighted
                  ? "shadow-soft ring-2 ring-primary scale-105"
                  : "shadow-card hover:shadow-soft"
              }`}
            >
              {plan.highlighted && (
                <div className="inline-block px-4 py-1 bg-primary text-primary-foreground rounded-full text-sm font-medium mb-4">
                  Most Popular
                </div>
              )}
              
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <p className="text-muted-foreground mb-6">{plan.description}</p>
              
              <div className="flex items-baseline mb-8">
                <span className="text-5xl font-bold">${plan.price}</span>
                <span className="text-muted-foreground ml-2">/month</span>
              </div>

              <Button
                variant={plan.highlighted ? "hero" : "outline"}
                size="lg"
                className="w-full mb-8"
              >
                Get Started
              </Button>

              <div className="space-y-4">
                {plan.features.map((feature, featureIndex) => (
                  <div key={featureIndex} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-12">
          All plans include a 7-day free trial. No credit card required.
        </p>
      </div>
    </section>
  );
};
