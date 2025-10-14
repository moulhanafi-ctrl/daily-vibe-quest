import { TrendingUp, Users, MessageSquare, Calendar } from "lucide-react";

const stats = [
  {
    icon: Users,
    value: "10,000+",
    label: "Active Users",
  },
  {
    icon: Calendar,
    value: "50,000+",
    label: "Daily Check-ins",
  },
  {
    icon: MessageSquare,
    value: "95%",
    label: "Feel Heard",
  },
  {
    icon: TrendingUp,
    value: "4.8★",
    label: "User Rating",
  },
];

export const Stats = () => {
  return (
    <section className="py-16 px-4 md:px-6 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      <div className="container mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="text-center space-y-3 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <Icon className="w-8 h-8 text-primary mx-auto" />
                <div>
                  <p className="text-4xl font-bold text-foreground mb-1">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
