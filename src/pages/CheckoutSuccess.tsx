import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    
    if (sessionId) {
      // Fetch order details from database
      const fetchOrder = async () => {
        try {
          const { data, error } = await supabase
            .from("orders")
            .select("*")
            .eq("session_id", sessionId)
            .single();

          if (error) {
            console.error("Error fetching order:", error);
          } else {
            setOrderDetails(data);
          }
        } catch (err) {
          console.error("Failed to fetch order:", err);
        } finally {
          setLoading(false);
        }
      };

      fetchOrder();
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <CardDescription>
            Thank you for supporting Daily Vibe Check!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {orderDetails && (
            <div className="bg-secondary/20 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Product:</span>
                <span className="text-sm">{orderDetails.product_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Amount:</span>
                <span className="text-sm">
                  ${(orderDetails.amount_total / 100).toFixed(2)} {orderDetails.currency?.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Status:</span>
                <span className="text-sm text-green-600 font-medium">
                  {orderDetails.payment_status}
                </span>
              </div>
            </div>
          )}

          <p className="text-sm text-muted-foreground text-center">
            Your payment has been processed successfully. Check your email for a confirmation receipt.
          </p>

          <Button 
            onClick={() => navigate("/dashboard")} 
            className="w-full"
            size="lg"
          >
            Return to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}