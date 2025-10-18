import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

const Terms = () => {
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
          <h1 className="text-4xl font-bold mb-2">Terms of Use</h1>
          <p className="text-sm text-muted-foreground">
            Version 1.0.0 | Effective Date: January 11, 2025
          </p>
        </div>

        <Card className="p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using Vibe Check ("the App"), you agree to be bound by these Terms of Use. 
              If you do not agree to these terms, do not use the App.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground mb-3">
              Vibe Check is a wellness and peer support platform designed to help users track their emotional 
              wellbeing, access motivational content, and connect with supportive communities.
            </p>
            <p className="text-muted-foreground font-semibold">
              IMPORTANT: Vibe Check is not therapy, medical care, counseling, or a crisis intervention service. 
              It is not a substitute for professional mental health treatment.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Age Requirements</h2>
            <ul className="space-y-2 text-muted-foreground list-disc list-inside">
              <li><strong>18+:</strong> Full access to all features</li>
              <li><strong>13-17 (Teens):</strong> Access with parental oversight options</li>
              <li><strong>Under 13 (Kids):</strong> Requires verified parental consent and limited features (COPPA compliance)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. User Conduct</h2>
            <p className="text-muted-foreground mb-3">You agree to:</p>
            <ul className="space-y-2 text-muted-foreground list-disc list-inside">
              <li>Follow the Community Guidelines</li>
              <li>Respect other users' privacy and dignity</li>
              <li>Not engage in harassment, bullying, hate speech, or threats</li>
              <li>Not post sexual content or make sexual advances</li>
              <li>Not spam, self-promote excessively, or run scams</li>
              <li>Not impersonate others or misrepresent your identity</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Content Moderation</h2>
            <p className="text-muted-foreground">
              We reserve the right to review, moderate, or remove any content that violates these Terms or 
              Community Guidelines. We may warn, mute, suspend, or permanently ban accounts that violate our policies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Purchases and Subscriptions</h2>
            <p className="text-muted-foreground mb-3">
              Purchases made through the App are subject to our Refund Policy. By purchasing:
            </p>
            <ul className="space-y-2 text-muted-foreground list-disc list-inside">
              <li>Digital products grant personal, non-transferable access</li>
              <li>Subscriptions auto-renew unless cancelled</li>
              <li>Refund requests must be made within policy timeframes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              Vibe Check is provided "as is" without warranties. We are not liable for any damages arising 
              from your use of the App. In jurisdictions that do not allow the exclusion of certain warranties, 
              these exclusions may not apply to you.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Privacy</h2>
            <p className="text-muted-foreground">
              Your use of the App is subject to our Privacy Policy, which explains how we collect, use, and 
              protect your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We may update these Terms from time to time. If we make material changes, we will notify you 
              and may require you to accept the updated Terms to continue using the App.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Contact</h2>
            <p className="text-muted-foreground">
              Questions about these Terms? Contact us at{" "}
              <a 
                href="mailto:legal@vibecheck.app" 
                className="text-primary underline hover:text-primary/80"
                target="_blank"
                rel="noopener noreferrer"
              >
                legal@vibecheck.app
              </a>
            </p>
            <p className="text-muted-foreground mt-2">
              For general support: <a 
                href="mailto:support@vibecheck.app" 
                className="text-primary underline hover:text-primary/80"
                target="_blank"
                rel="noopener noreferrer"
              >
                support@vibecheck.app
              </a>
            </p>
          </section>
        </Card>
      </main>
    </div>
  );
};

export default Terms;