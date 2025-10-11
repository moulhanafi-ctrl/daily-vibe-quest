import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  product_type: "physical" | "digital";
  download_link: string | null;
}

interface ProductCardProps {
  product: Product;
  onAddToCart: () => void;
}

export const ProductCard = ({ product, onAddToCart }: ProductCardProps) => {
  const [loading, setLoading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const navigate = useNavigate();

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to add items to cart");
        return;
      }

      const { error } = await supabase
        .from("cart_items")
        .upsert({
          user_id: user.id,
          product_id: product.id,
          quantity: 1,
        }, {
          onConflict: "user_id,product_id",
        });

      if (error) throw error;

      toast.success(`Added to cart! 🛒 ${product.name} has been added to your cart`);
      onAddToCart();
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" 
      onClick={() => navigate(`/store/product/${product.id}`)}
    >
      <div className="aspect-square bg-secondary/20 flex items-center justify-center relative">
        {product.image_url ? (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-pulse text-4xl">
                  {product.product_type === "digital" ? "📱" : "📦"}
                </div>
              </div>
            )}
            <img
              src={product.image_url}
              alt={product.name}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              className={`w-full h-full object-cover transition-opacity ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
            />
          </>
        ) : (
          <div className="text-6xl">
            {product.product_type === "digital" ? "📱" : "📦"}
          </div>
        )}
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-lg line-clamp-1">{product.name}</h3>
          {product.product_type === "digital" && (
            <Download className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {product.description}
        </p>
        <div className="flex items-center justify-between pt-2">
          <span className="text-2xl font-bold">${product.price}</span>
          <Button
            onClick={handleAddToCart}
            disabled={loading}
            size="sm"
            aria-label={`Add ${product.name} to cart`}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Add to Cart
          </Button>
        </div>
      </div>
    </Card>
  );
};
