import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Heart, Users, Shield, Accessibility } from "lucide-react";

const Inclusion = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Inclusion & Respect</h1>
          <p className="text-lg text-muted-foreground">
            Everyone belongs here. Here's how we support all communities.
          </p>
        </div>

        <Card className="p-8 mb-8 bg-primary/10 border-primary/20">
          <div className="flex items-start gap-4">
            <Heart className="h-8 w-8 text-primary flex-shrink-0" />
            <div>
              <h2 className="text-2xl font-semibold mb-3">Our Commitment</h2>
              <p className="text-muted-foreground">
                Vibe Check is inclusive by design. We welcome people of all backgrounds, identities, and 
                experiences — including the LGBTQ+ community. We're committed to creating a safe, affirming 
                space where everyone can be their authentic selves.
              </p>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-start gap-4 mb-4">
              <Users className="h-6 w-6 text-primary flex-shrink-0" />
              <h2 className="text-2xl font-semibold">LGBTQ+ Support</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                We affirm and celebrate LGBTQ+ identities. Our platform:
              </p>
              <ul className="space-y-2 list-disc list-inside ml-4">
                <li>Allows users to share their pronouns (optional)</li>
                <li>Enforces zero tolerance for discrimination based on sexual orientation or gender identity</li>
                <li>Trains moderators on LGBTQ+ cultural competency</li>
                <li>Partners with LGBTQ+ mental health organizations</li>
                <li>Celebrates Pride and other LGBTQ+ awareness events</li>
              </ul>
              <p className="mt-4">
                <strong>Crisis Resources for LGBTQ+ Youth:</strong>
              </p>
              <ul className="space-y-2 list-disc list-inside ml-4">
                <li>Trevor Project: Call <strong>1-866-488-7386</strong> or text START to <strong>678-678</strong></li>
                <li>Trans Lifeline: <strong>1-877-565-8860</strong> (US) / <strong>1-877-330-6366</strong> (Canada)</li>
              </ul>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start gap-4 mb-4">
              <Shield className="h-6 w-6 text-primary flex-shrink-0" />
              <h2 className="text-2xl font-semibold">Anti-Discrimination Enforcement</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                We have zero tolerance for discrimination, hate speech, or harassment based on:
              </p>
              <ul className="space-y-2 list-disc list-inside ml-4">
                <li>Sexual orientation or gender identity/expression</li>
                <li>Race, ethnicity, or national origin</li>
                <li>Religion or belief system</li>
                <li>Disability or neurodivergence</li>
                <li>Age or family structure</li>
                <li>Body size or appearance</li>
                <li>Any other personal characteristic</li>
              </ul>
              <p className="mt-4">
                Our moderation team is trained to recognize and address discrimination quickly. 
                Violations result in graduated enforcement: warning → temporary mute → suspension → permanent ban.
              </p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start gap-4 mb-4">
              <Accessibility className="h-6 w-6 text-primary flex-shrink-0" />
              <h2 className="text-2xl font-semibold">Accessibility & Universal Design</h2>
            </div>
            <div className="space-y-3 text-muted-foreground">
              <p>
                We're building for everyone:
              </p>
              <ul className="space-y-2 list-disc list-inside ml-4">
                <li>Screen reader compatible (WCAG 2.1 AA standards)</li>
                <li>Keyboard navigation throughout the app</li>
                <li>High contrast mode and dark mode support</li>
                <li>Adjustable text sizes and font options</li>
                <li>Alt text for images and descriptive labels</li>
                <li>Clear, plain language throughout</li>
              </ul>
              <p className="mt-4">
                Have accessibility feedback? Email us at{" "}
                <a href="mailto:accessibility@vibecheck.app" className="text-primary underline">
                  accessibility@vibecheck.app
                </a>
              </p>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Respectful Participation</h2>
            <div className="space-y-3 text-muted-foreground">
              <p>
                Creating an inclusive community is everyone's responsibility. We ask all users to:
              </p>
              <ul className="space-y-2 list-disc list-inside ml-4">
                <li>Use people's correct names and pronouns</li>
                <li>Be open to learning and correcting mistakes</li>
                <li>Avoid assumptions about others' identities or experiences</li>
                <li>Speak up (kindly) when you see discrimination</li>
                <li>Report violations to help us maintain a safe space</li>
              </ul>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Ongoing Work</h2>
            <p className="text-muted-foreground mb-4">
              Inclusion is not a destination—it's an ongoing commitment. We're continuously:
            </p>
            <ul className="space-y-2 text-muted-foreground list-disc list-inside ml-4">
              <li>Reviewing our policies through an equity lens</li>
              <li>Listening to feedback from marginalized communities</li>
              <li>Training our team on cultural competency</li>
              <li>Improving our accessibility features</li>
              <li>Partnering with advocacy organizations</li>
            </ul>
          </Card>

          <Card className="p-6 bg-secondary/20">
            <h2 className="text-xl font-semibold mb-3">Questions or Feedback?</h2>
            <p className="text-muted-foreground mb-4">
              We want to hear from you. Contact us at:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                General: <a href="mailto:support@vibecheck.app" className="text-primary underline">
                  support@vibecheck.app
                </a>
              </li>
              <li>
                Inclusion concerns: <a href="mailto:inclusion@vibecheck.app" className="text-primary underline">
                  inclusion@vibecheck.app
                </a>
              </li>
            </ul>
          </Card>

          <div className="text-center p-8">
            <p className="text-lg font-semibold mb-2">🏳️‍🌈 Inclusive by design. Everyone belongs here. 🏳️‍⚧️</p>
            <p className="text-sm text-muted-foreground">
              Version 1.0.0 | Updated January 11, 2025
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Inclusion;