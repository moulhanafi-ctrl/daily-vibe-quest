import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trash2, Plus, Minus } from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  images: string[] | null;
  product_type: "physical" | "digital";
  age_group: string;
  tags: string[] | null;
}

interface CartItem {
  id: string;
  quantity: number;
  products: Product;
}

const Cart = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [crossSellProducts, setCrossSellProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("cart_items")
        .select(`
          id,
          quantity,
          products (
            id,
            name,
            description,
            price,
            image_url,
            images,
            product_type,
            age_group,
            tags
          )
        `)
        .eq("user_id", user.id);

      if (error) throw error;
      setCartItems(data || []);

      // Load cross-sell products based on cart contents
      if (data && data.length > 0) {
        const ageGroups = [...new Set(data.map(item => item.products?.age_group).filter(Boolean))];
        const tags = [...new Set(data.flatMap(item => item.products?.tags || []))];
        
        let query = supabase
          .from("products")
          .select("*")
          .eq("active", true)
          .not("id", "in", `(${data.map(item => item.products?.id).join(",")})`);
        
        if (ageGroups.length > 0) {
          query = query.in("age_group", ageGroups);
        }
        
        const { data: crossSellData } = await query.limit(4);
        setCrossSellProducts(crossSellData || []);
      }
    } catch (error: any) {
      toast.error(`Error loading cart: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    try {
      const { error } = await supabase
        .from("cart_items")
        .update({ quantity: newQuantity })
        .eq("id", itemId);

      if (error) throw error;
      loadCart();
    } catch (error: any) {
      toast.error(`Error updating quantity: ${error.message}`);
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
      loadCart();
      toast.success("Item removed from cart");
    } catch (error: any) {
      toast.error(`Error removing item: ${error.message}`);
    }
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;

    setCheckingOut(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-product-checkout", {
        body: { cartItems },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      toast.error(`Checkout error: ${error.message || "Failed to create checkout session"}`);
    } finally {
      setCheckingOut(false);
    }
  };

  const total = cartItems.reduce(
    (sum, item) => sum + (item.products?.price || 0) * item.quantity,
    0
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

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
        <h1 className="text-3xl font-bold mb-8">Your Cart 🛒</h1>

        {cartItems.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="space-y-4">
              <p className="text-xl text-muted-foreground">Your cart is empty</p>
              <Button onClick={() => navigate("/store")}>
                Start Shopping
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              {cartItems.map((item) => (
                <Card key={item.id} className="p-4">
                  <div className="flex gap-4">
                    <div className="w-24 h-24 bg-secondary/20 rounded flex-shrink-0 flex items-center justify-center">
                      {item.products?.image_url ? (
                        <img
                          src={item.products.image_url}
                          alt={item.products.name}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <span className="text-3xl">
                          {item.products?.product_type === "digital" ? "📱" : "📦"}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">
                        {item.products?.name}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.products?.description}
                      </p>
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <span className="font-bold">
                          ${((item.products?.price || 0) * item.quantity).toFixed(2)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="ml-auto"
                          onClick={() => removeItem(item.id)}
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xl font-bold">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleCheckout}
                  disabled={checkingOut}
                >
                  {checkingOut ? "Processing..." : "Proceed to Checkout"}
                </Button>
              </div>
            </Card>

            {/* Cross-sell recommendations */}
            {crossSellProducts.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-bold mb-4">You May Also Like</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {crossSellProducts.map((product) => (
                    <Card
                      key={product.id}
                      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => navigate(`/store/product/${product.id}`)}
                    >
                      <div className="aspect-video bg-secondary/20 flex items-center justify-center">
                        {product.images?.[0] || product.image_url ? (
                          <img
                            src={product.images?.[0] || product.image_url!}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-5xl">
                            {product.product_type === "digital" ? "📱" : "📦"}
                          </span>
                        )}
                      </div>
                      <div className="p-4">
                        <div className="flex gap-2 mb-2">
                          <Badge variant="secondary">{product.age_group}</Badge>
                          <Badge variant="outline">{product.product_type}</Badge>
                        </div>
                        <h3 className="font-semibold line-clamp-1 mb-1">{product.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {product.description}
                        </p>
                        <p className="text-xl font-bold text-primary">${product.price}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Cart;
