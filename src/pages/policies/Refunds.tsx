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
        <h1 className="text-4xl font-bold mb-8">Refund Policy 💰</h1>
        
        <Card className="p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-3">30-Day Money-Back Guarantee</h2>
            <p className="text-muted-foreground">
              We want you to love your purchase! If you're not completely satisfied, request a refund within 30 days of purchase.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">Digital Products</h2>
            <p className="text-muted-foreground">
              Digital products can be refunded within 14 days if you haven't accessed or downloaded the content.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">Physical Products</h2>
            <p className="text-muted-foreground mb-3">
              Physical products can be returned within 30 days in original condition. Return shipping costs apply.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">How to Request a Refund</h2>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>Go to your Order History</li>
              <li>Select the order you want to refund</li>
              <li>Click "Request Refund"</li>
              <li>Provide a brief reason</li>
              <li>We'll process within 3-5 business days</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">Refund Processing Time</h2>
            <p className="text-muted-foreground">
              Refunds are typically processed within 5-7 business days and will appear on your original payment method.
            </p>
          </section>
        </Card>
      </main>
    </div>
  );
};

export default Refunds;