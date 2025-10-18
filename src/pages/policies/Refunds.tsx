import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

const Refunds = () => {
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

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Refund Policy</h1>
          <p className="text-sm text-muted-foreground">
            Version 1.0.0 | Last Updated: January 18, 2025
          </p>
        </div>
        
        <Card className="p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-3">Subscription Refunds</h2>
            <p className="text-muted-foreground mb-3">
              We want you to be satisfied with your Vibe Check subscription. If you're not happy:
            </p>
            <ul className="space-y-2 text-muted-foreground list-disc list-inside">
              <li><strong>First 7 days:</strong> Full refund, no questions asked</li>
              <li><strong>After 7 days:</strong> Pro-rated refund for unused time</li>
              <li><strong>Cancellation:</strong> Cancel anytime; access continues until period ends</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              To cancel your subscription, go to Settings → Subscription Management or email <a 
                href="mailto:billing@vibecheck.app" 
                className="text-primary underline hover:text-primary/80"
                target="_blank"
                rel="noopener noreferrer"
              >
                billing@vibecheck.app
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">Digital Products</h2>
            <p className="text-muted-foreground">
              Digital products (eBooks, guides, downloads) can be refunded within 14 days if you haven't accessed or downloaded the content. Once accessed, all sales are final.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">Physical Products</h2>
            <p className="text-muted-foreground mb-3">
              Physical products can be returned within 30 days in original, unopened condition:
            </p>
            <ul className="space-y-2 text-muted-foreground list-disc list-inside">
              <li>Item must be unused and in original packaging</li>
              <li>Return shipping costs are the responsibility of the customer</li>
              <li>Refund issued once item is received and inspected</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">How to Request a Refund</h2>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>Email <a 
                href="mailto:refunds@vibecheck.app" 
                className="text-primary underline hover:text-primary/80"
                target="_blank"
                rel="noopener noreferrer"
              >
                refunds@vibecheck.app
              </a> with your order number</li>
              <li>Provide a brief reason for the refund request</li>
              <li>We'll review and respond within 2 business days</li>
              <li>Once approved, refunds process within 5-7 business days</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">Refund Processing Time</h2>
            <p className="text-muted-foreground">
              Refunds are processed to your original payment method within 5-7 business days after approval. Depending on your bank or card issuer, it may take an additional 3-5 business days to appear on your statement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">Non-Refundable Items</h2>
            <ul className="space-y-2 text-muted-foreground list-disc list-inside">
              <li>Accessed or downloaded digital content</li>
              <li>Gift cards and promotional credits</li>
              <li>Opened or used physical products</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">Contact Us</h2>
            <p className="text-muted-foreground">
              Questions about our refund policy? Contact us at{" "}
              <a 
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

export default Refunds;