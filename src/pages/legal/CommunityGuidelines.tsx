import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, AlertTriangle } from "lucide-react";

const CommunityGuidelines = () => {
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
          <h1 className="text-4xl font-bold mb-2">Community Guidelines</h1>
          <p className="text-lg text-muted-foreground">
            Creating a safe, supportive space for everyone 🤝
          </p>
        </div>

        <Card className="p-6 mb-8 bg-primary/10 border-primary/20">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold mb-2">Our Core Principle</h3>
              <p className="text-sm text-muted-foreground">
                Vibe Check is a judgment-free zone built on kindness, respect, and mutual support. 
                We all have tough days—these guidelines help us lift each other up.
              </p>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              💛 Be Kind & Supportive
            </h2>
            <ul className="space-y-2 text-muted-foreground list-disc list-inside">
              <li>Treat everyone with empathy and compassion</li>
              <li>Celebrate others' wins and support them through struggles</li>
              <li>Offer encouragement, not judgment</li>
              <li>Remember: everyone is fighting battles you can't see</li>
            </ul>
          </Card>

          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              🚫 Zero Tolerance Policies
              <Badge variant="destructive">Enforced</Badge>
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2 text-red-600 dark:text-red-400">
                  No Bullying, Harassment, or Hate Speech
                </h3>
                <p className="text-sm text-muted-foreground">
                  No attacks based on race, gender, sexuality, religion, disability, or any personal characteristic. 
                  No threats, intimidation, or targeted harassment.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-red-600 dark:text-red-400">
                  No Sexual Content or Advances
                </h3>
                <p className="text-sm text-muted-foreground">
                  No explicit content, sexual solicitation, or unwanted romantic/sexual messages. 
                  This includes suggestive images, links, or language.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-red-600 dark:text-red-400">
                  No Violence or Self-Harm Encouragement
                </h3>
                <p className="text-sm text-muted-foreground">
                  Never encourage, glorify, or provide instructions for self-harm, suicide, or violence. 
                  If someone expresses suicidal thoughts, direct them to crisis resources and notify a moderator.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">🔒 Respect Privacy</h2>
            <ul className="space-y-2 text-muted-foreground list-disc list-inside">
              <li>Don't share others' personal information (names, addresses, photos)</li>
              <li>Don't screenshot or share private conversations</li>
              <li>Keep what's shared in support rooms confidential</li>
              <li>Ask before sharing someone else's story</li>
            </ul>
          </Card>

          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">✨ Quality Over Quantity</h2>
            <ul className="space-y-2 text-muted-foreground list-disc list-inside">
              <li>No spam, repetitive messages, or flooding chats</li>
              <li>No excessive self-promotion or advertising</li>
              <li>No scams, pyramid schemes, or get-rich-quick offers</li>
              <li>Stay on topic in themed support rooms</li>
            </ul>
          </Card>

          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">🆘 Crisis Situations</h2>
            <div className="space-y-3">
              <p className="text-muted-foreground">
                If you or someone in a room expresses immediate danger or suicidal intent:
              </p>
              <ol className="space-y-2 text-muted-foreground list-decimal list-inside">
                <li><strong>Don't ignore it.</strong> Take all crisis statements seriously.</li>
                <li><strong>Share crisis resources immediately</strong> (988 in US/Canada, 116 123 in UK/Ireland)</li>
                <li><strong>Report to a moderator</strong> using the Report button</li>
                <li><strong>Encourage professional help</strong> - we're peer support, not crisis counseling</li>
              </ol>
              <Button className="mt-4" variant="outline" asChild>
                <a href="/crisis" target="_blank">
                  View Full Crisis Resources →
                </a>
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">⚖️ Enforcement</h2>
            <p className="text-muted-foreground mb-4">
              Violations are handled with graduated responses:
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Badge>1st Violation</Badge>
                <span className="text-sm text-muted-foreground">Warning + educational message</span>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="secondary">2nd Violation</Badge>
                <span className="text-sm text-muted-foreground">24-hour mute from chat rooms</span>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline">3rd Violation</Badge>
                <span className="text-sm text-muted-foreground">7-day suspension</span>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="destructive">Severe/Repeat</Badge>
                <span className="text-sm text-muted-foreground">Permanent ban</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Severe violations (threats, sexual content, hate speech) may result in immediate permanent ban.
            </p>
          </Card>

          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">📣 Reporting</h2>
            <p className="text-muted-foreground mb-3">
              See something that violates these guidelines? Use the Report button on any message. 
              All reports are reviewed by our moderation team.
            </p>
            <p className="text-sm text-muted-foreground">
              False reports or report abuse may result in account restrictions.
            </p>
          </Card>

          <Card className="p-6 bg-secondary/20">
            <h2 className="text-xl font-semibold mb-3">Questions?</h2>
            <p className="text-muted-foreground">
              Contact our team at{" "}
              <a href="mailto:support@vibecheck.app" className="text-primary underline">
                support@vibecheck.app
              </a>
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default CommunityGuidelines;