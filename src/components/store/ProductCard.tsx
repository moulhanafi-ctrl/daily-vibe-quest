import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Download, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

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
  const [showCartAnimation, setShowCartAnimation] = useState(false);
  const navigate = useNavigate();
  
  // Check if this is the $1 Test Product
  const isTestProduct = product.price === 1 && product.name.toLowerCase().includes('test');

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

      // Show animation
      setShowCartAnimation(true);
      setTimeout(() => setShowCartAnimation(false), 1000);
      
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
      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer relative" 
      onClick={() => navigate(`/store/product/${product.id}`)}
    >
      {/* Add to Cart Animation */}
      <AnimatePresence>
        {showCartAnimation && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-primary/20 backdrop-blur-sm rounded-lg"
          >
            <motion.div
              initial={{ y: 0 }}
              animate={{ y: -100, opacity: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-primary text-primary-foreground rounded-full p-4 shadow-lg"
            >
              <ShoppingCart className="h-8 w-8" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
          {isTestProduct ? (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                window.open("https://buy.stripe.com/6oUcN5guibSD9ZRbv5dnW00", "_blank");
              }}
              size="sm"
              className="bg-gradient-to-r from-primary to-primary/80"
              aria-label={`Buy ${product.name} now`}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Buy Now
            </Button>
          ) : (
            <Button
              onClick={handleAddToCart}
              disabled={loading}
              size="sm"
              aria-label={`Add ${product.name} to cart`}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Add to Cart
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
