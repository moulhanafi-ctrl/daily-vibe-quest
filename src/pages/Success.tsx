import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { useEffect } from "react";

const Success = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Track successful purchase
    const trackPurchase = async () => {
      // Optional: Add analytics tracking here
    };
    trackPurchase();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl">Thank you for your purchase! 🎉</CardTitle>
          <CardDescription className="text-base mt-2">
            Your order has been confirmed and will be processed shortly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You'll receive an email confirmation with your order details.
          </p>
          <div className="flex gap-3 flex-col sm:flex-row">
            <Button 
              onClick={() => navigate("/orders")} 
              className="flex-1"
            >
              View Orders
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate("/store")} 
              className="flex-1"
            >
              Continue Shopping
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Success;
