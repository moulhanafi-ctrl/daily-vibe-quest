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
            <p className="text-muted-foreground mb-3">
              We retain your personal data for as long as your account remains active or as needed to provide our services. Specific retention periods:
            </p>
            <ul className="space-y-2 text-muted-foreground list-disc list-inside">
              <li><strong>Account data:</strong> Until you request deletion</li>
              <li><strong>Journal entries:</strong> Until you delete them or close your account</li>
              <li><strong>Purchase history:</strong> 7 years for tax and legal compliance</li>
              <li><strong>Analytics data:</strong> Anonymized after 26 months</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              You can request immediate deletion of your account and associated data at any time through Settings → Privacy Controls.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Cookie Policy</h2>
            <p className="text-muted-foreground mb-3">
              We use cookies and similar tracking technologies to improve your experience:
            </p>
            <ul className="space-y-2 text-muted-foreground list-disc list-inside">
              <li><strong>Essential cookies:</strong> Required for authentication and security</li>
              <li><strong>Analytics cookies:</strong> Help us understand how you use the app</li>
              <li><strong>Preference cookies:</strong> Remember your settings (theme, language)</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              You can manage cookie preferences through your browser settings. Disabling essential cookies may limit functionality.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
            <p className="text-muted-foreground">
              Privacy questions? Email us at{" "}
              <a 
                href="mailto:privacy@vibecheck.app" 
                className="text-primary underline hover:text-primary/80"
                target="_blank"
                rel="noopener noreferrer"
              >
                privacy@vibecheck.app
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

export default Privacy;