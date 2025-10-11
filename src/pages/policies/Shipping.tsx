import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

const Shipping = () => {
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
        <h1 className="text-4xl font-bold mb-8">Shipping Policy 📦</h1>
        
        <Card className="p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-3">Digital Products</h2>
            <p className="text-muted-foreground">
              Digital products are delivered instantly via email and are accessible in your library immediately after purchase. No physical shipping required!
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">Physical Products</h2>
            <p className="text-muted-foreground mb-3">
              Physical products are shipped within 2-3 business days of order confirmation.
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Standard shipping: 5-7 business days</li>
              <li>Express shipping: 2-3 business days</li>
              <li>International shipping: 10-15 business days</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">Shipping Costs</h2>
            <p className="text-muted-foreground">
              Shipping costs are calculated at checkout based on your location and selected shipping method.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">Tracking</h2>
            <p className="text-muted-foreground">
              Once your order ships, you'll receive a tracking number via email to monitor your delivery.
            </p>
          </section>
        </Card>
      </main>
    </div>
  );
};

export default Shipping;