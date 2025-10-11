import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { STRIPE_PLANS } from "@/lib/stripe";
import { useState } from "react";

const plans = [
  {
    name: "Individual",
    price: "5.99",
    description: "Perfect for personal mental wellness",
    features: [
      "Daily mood check-ins",
      "Personalized motivational content",
      "AI-driven notifications",
      "Progress tracking",
      "Crisis resources",
      "Community chat rooms",
      "Mobile app access",
    ],
    highlighted: false,
  },
  {
    name: "Family",
    price: "9.99",
    description: "For families supporting each other",
    features: [
      "Everything in Individual",
      "Up to 6 family members",
      "Shared family dashboard",
      "Family chat rooms",
      "Age-appropriate content",
      "Weekly family reflections",
      "Parental controls",
      "Priority support",
    ],
    highlighted: true,
  },
];

export const Pricing = () => {
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (planType: "individual" | "family") => {
    setLoading(planType);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please sign in to subscribe",
          variant: "destructive",
        });
        window.location.href = "/auth";
        return;
      }

      const priceId = STRIPE_PLANS[planType].price_id;
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start checkout",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

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
              className={`gradient-card p-8 rounded-3xl transition-smooth hover:-translate-y-2 animate-fade-in ${
                plan.highlighted
                  ? "shadow-soft ring-2 ring-primary md:scale-105"
                  : "shadow-card hover:shadow-soft"
              }`}
              style={{ animationDelay: `${index * 0.2}s` }}
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
                onClick={() => handleCheckout(index === 0 ? "individual" : "family")}
                disabled={loading !== null}
              >
                {loading === (index === 0 ? "individual" : "family") ? "Loading..." : "Get Started"}
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
