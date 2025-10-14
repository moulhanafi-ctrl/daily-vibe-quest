import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Emma, 15",
    location: "California",
    text: "Finally, a mental health app that doesn't feel like therapy homework. The daily check-ins take 30 seconds and actually help me understand my patterns.",
    rating: 5,
  },
  {
    name: "David, Parent",
    location: "Texas",
    text: "Family Mode changed everything. I can see when my teenager is struggling without being invasive. We talk more now, not less.",
    rating: 5,
  },
  {
    name: "Alex, 17",
    location: "New York",
    text: "The community rooms are actually safe and moderated. It's nice to talk to people who get it, without judgment or drama.",
    rating: 5,
  },
  {
    name: "Sarah, 22",
    location: "Oregon",
    text: "I love that it's not pushing me to journal pages every day. Some days it's just an emoji, and that's okay. Real mental health is flexible.",
    rating: 5,
  },
];

export const Testimonials = () => {
  return (
    <section className="py-24 px-4 md:px-6 bg-gradient-to-br from-background via-secondary/10 to-background">
      <div className="container mx-auto">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 bg-card/80 backdrop-blur px-4 py-2 rounded-full shadow-card border border-primary/20">
            <Star className="w-4 h-4 text-primary fill-primary" />
            <span className="text-sm font-medium">Trusted by thousands</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold">
            Real people, <span className="text-primary">real progress</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            See what our community members say about their wellness journey
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="gradient-card p-6 rounded-3xl shadow-card hover:shadow-soft transition-smooth group hover:-translate-y-2 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <Quote className="w-8 h-8 text-primary/30 mb-4" />
              
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-primary fill-primary" />
                ))}
              </div>

              <p className="text-muted-foreground mb-6 leading-relaxed">
                "{testimonial.text}"
              </p>

              <div className="pt-4 border-t border-border/50">
                <p className="font-semibold text-foreground">{testimonial.name}</p>
                <p className="text-sm text-muted-foreground">{testimonial.location}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Join <span className="font-semibold text-primary">10,000+ users</span> on their wellness journey
          </p>
        </div>
      </div>
    </section>
  );
};
