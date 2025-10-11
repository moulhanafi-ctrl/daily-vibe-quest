import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Phone, MessageSquare, Globe } from "lucide-react";

const Crisis = () => {
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
        <Card className="p-8 mb-8 bg-red-500/10 border-red-500/20">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-red-600 dark:text-red-400">
              🆘 Crisis Resources
            </h1>
            <p className="text-xl text-muted-foreground">
              If you're in immediate danger or experiencing a mental health crisis, 
              please reach out for professional help right now.
            </p>
            <p className="text-lg font-semibold">
              You don't have to face this alone. Help is available 24/7.
            </p>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <Phone className="h-8 w-8 text-primary flex-shrink-0" />
              <div className="flex-1">
                <h2 className="text-2xl font-semibold mb-4">United States & Canada</h2>
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg mb-1">988 Suicide & Crisis Lifeline</h3>
                    <p className="text-muted-foreground mb-2">
                      Call or text <strong className="text-primary">988</strong>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Free, confidential support 24/7 for people in distress, prevention and crisis resources.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Crisis Text Line</h3>
                    <p className="text-muted-foreground mb-2">
                      Text <strong className="text-primary">HOME</strong> to <strong className="text-primary">741741</strong>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Connect with a crisis counselor via text message.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start gap-4">
              <Phone className="h-8 w-8 text-primary flex-shrink-0" />
              <div className="flex-1">
                <h2 className="text-2xl font-semibold mb-4">United Kingdom & Ireland</h2>
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Samaritans</h3>
                    <p className="text-muted-foreground mb-2">
                      Call <strong className="text-primary">116 123</strong> (free)
                    </p>
                    <p className="text-muted-foreground mb-2">
                      Email: <a href="mailto:jo@samaritans.org" className="text-primary underline">jo@samaritans.org</a>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Available 24/7 to provide emotional support to anyone in distress.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Shout UK</h3>
                    <p className="text-muted-foreground mb-2">
                      Text <strong className="text-primary">SHOUT</strong> to <strong className="text-primary">85258</strong>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      24/7 text support for anyone in crisis.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start gap-4">
              <Globe className="h-8 w-8 text-primary flex-shrink-0" />
              <div className="flex-1">
                <h2 className="text-2xl font-semibold mb-4">International Resources</h2>
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold mb-2">Find A Helpline</h3>
                    <Button variant="outline" asChild>
                      <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer">
                        Visit findahelpline.com →
                      </a>
                    </Button>
                    <p className="text-sm text-muted-foreground mt-2">
                      Global directory of mental health and crisis support services by country.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">International Association for Suicide Prevention</h3>
                    <Button variant="outline" asChild>
                      <a href="https://www.iasp.info/resources/Crisis_Centres" target="_blank" rel="noopener noreferrer">
                        Visit IASP →
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Other Important Resources</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-1">National Domestic Violence Hotline (US)</h3>
                <p className="text-muted-foreground">
                  Call <strong>1-800-799-7233</strong> or text <strong>START</strong> to <strong>88788</strong>
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">RAINN Sexual Assault Hotline (US)</h3>
                <p className="text-muted-foreground">
                  Call <strong>1-800-656-4673</strong>
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Trevor Project (LGBTQ+ Youth, US)</h3>
                <p className="text-muted-foreground">
                  Call <strong>1-866-488-7386</strong> or text <strong>START</strong> to <strong>678-678</strong>
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Veterans Crisis Line (US)</h3>
                <p className="text-muted-foreground">
                  Call <strong>1-800-273-8255</strong> and press 1, or text <strong>838255</strong>
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-secondary/20">
            <h2 className="text-xl font-semibold mb-3">Remember</h2>
            <ul className="space-y-2 text-muted-foreground list-disc list-inside">
              <li>Crisis feelings are temporary, even when they feel overwhelming</li>
              <li>Reaching out is a sign of strength, not weakness</li>
              <li>Professional help can make a real difference</li>
              <li>You matter, and people care about you</li>
            </ul>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Crisis;