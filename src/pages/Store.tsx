import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShoppingBag, ArrowLeft } from "lucide-react";

const Store = () => {
  const navigate = useNavigate();

  const ageGroups = [
    {
      id: "child",
      title: "🧒 Kids (5–12)",
      description: "Playful tools to explore feelings and build confidence",
      gradient: "from-yellow-400/20 via-orange-400/20 to-pink-400/20",
      borderColor: "border-yellow-500/30",
    },
    {
      id: "teen",
      title: "🧑‍🎓 Teens (13–17)",
      description: "Cool resources for self-discovery and empowerment",
      gradient: "from-purple-400/20 via-blue-400/20 to-cyan-400/20",
      borderColor: "border-purple-500/30",
    },
    {
      id: "adult",
      title: "🧍‍♂️ Adults (18–60)",
      description: "Practical tools for balance, growth, and connection",
      gradient: "from-blue-400/20 via-green-400/20 to-emerald-400/20",
      borderColor: "border-blue-500/30",
    },
    {
      id: "elder",
      title: "👵 Elders (61+)",
      description: "Meaningful resources for reflection and legacy",
      gradient: "from-green-400/20 via-teal-400/20 to-blue-400/20",
      borderColor: "border-green-500/30",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold gradient-primary">Vibe Shop 🛍️</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/cart")}
            aria-label="View cart"
          >
            <ShoppingBag className="h-4 w-4 mr-2" />
            Cart
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            Feel-Good Finds for Every Age 🌈
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover curated products designed to support your emotional wellbeing
            at every stage of life
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {ageGroups.map((group) => (
            <Card
              key={group.id}
              className={`p-6 cursor-pointer transition-all hover:scale-105 hover:shadow-lg bg-gradient-to-br ${group.gradient} ${group.borderColor} border-2`}
              onClick={() => navigate(`/store/${group.id}`)}
            >
              <div className="space-y-3">
                <h3 className="text-2xl font-bold">{group.title}</h3>
                <p className="text-muted-foreground">{group.description}</p>
                <Button variant="outline" className="w-full">
                  Explore Collection →
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Store;
