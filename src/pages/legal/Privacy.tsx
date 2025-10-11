import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

const Privacy = () => {
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
          <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">
            Version 1.0.0 | Effective Date: January 11, 2025
          </p>
        </div>

        <Card className="p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Our Commitment</h2>
            <p className="text-muted-foreground">
              Your privacy matters. This policy explains what data we collect, how we use it, and your rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Account Information</h3>
                <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                  <li>Email address</li>
                  <li>Username</li>
                  <li>Age group (child, teen, adult, elder)</li>
                  <li>Optional: First name, avatar</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Wellness Data</h3>
                <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                  <li>Mood check-ins and intensity ratings</li>
                  <li>Reflections and journal entries</li>
                  <li>Selected focus areas</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Usage Data</h3>
                <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                  <li>Pages visited and features used</li>
                  <li>Chat room participation</li>
                  <li>Purchase history</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
            <ul className="space-y-2 text-muted-foreground list-disc list-inside">
              <li>Provide and improve our services</li>
              <li>Personalize your experience and content</li>
              <li>Facilitate community features (chat rooms)</li>
              <li>Process purchases and subscriptions</li>
              <li>Send important updates and notifications</li>
              <li>Enforce our Terms and Community Guidelines</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Data Sharing</h2>
            <p className="text-muted-foreground mb-3">
              <strong>We do not sell your personal data.</strong>
            </p>
            <p className="text-muted-foreground mb-3">We may share data with:</p>
            <ul className="space-y-2 text-muted-foreground list-disc list-inside">
              <li><strong>Service providers:</strong> Payment processors, cloud hosting, analytics</li>
              <li><strong>Parents/Guardians:</strong> If you're a minor, limited data may be visible to linked parents</li>
              <li><strong>Legal requirements:</strong> When required by law or to protect safety</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Children's Privacy (COPPA)</h2>
            <p className="text-muted-foreground mb-3">
              For users under 13, we obtain verifiable parental consent before collecting personal information. 
              Parents can:
            </p>
            <ul className="space-y-2 text-muted-foreground list-disc list-inside">
              <li>Review their child's information</li>
              <li>Request deletion</li>
              <li>Refuse further collection</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Your Rights</h2>
            <p className="text-muted-foreground mb-3">You have the right to:</p>
            <ul className="space-y-2 text-muted-foreground list-disc list-inside">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your account and data</li>
              <li>Export your data</li>
              <li>Opt out of marketing communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Data Security</h2>
            <p className="text-muted-foreground">
              We use industry-standard security measures including encryption, secure servers, and access controls. 
              However, no system is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your data as long as your account is active or as needed to provide services. 
              You can request deletion at any time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
            <p className="text-muted-foreground">
              Privacy questions? Email us at{" "}
              <a href="mailto:privacy@vibecheck.app" className="text-primary underline">
                privacy@vibecheck.app
              </a>
            </p>
          </section>
        </Card>
      </main>
    </div>
  );
};

export default Privacy;