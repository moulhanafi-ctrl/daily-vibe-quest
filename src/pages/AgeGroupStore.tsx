import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/store/ProductCard";
import { ProductSkeleton } from "@/components/store/ProductSkeleton";
import { ArrowLeft, ShoppingBag } from "lucide-react";
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

const AGE_GROUP_INFO: Record<string, { title: string; banner: string; emoji: string; dbValue: string }> = {
  kids: {
    title: "Kids Collection (5-12)",
    banner: "Small vibes make big change 🌈",
    emoji: "🧒",
    dbValue: "child",
  },
  teens: {
    title: "Teen Collection (13-17)",
    banner: "Your journey, your way 🚀",
    emoji: "🧑‍🎓",
    dbValue: "teen",
  },
  adults: {
    title: "Adult Collection (18-60)",
    banner: "Invest in your wellbeing 💫",
    emoji: "🧍‍♂️",
    dbValue: "adult",
  },
  elders: {
    title: "Elder Collection (61+)",
    banner: "Wisdom meets wellness 🌸",
    emoji: "👵",
    dbValue: "elder",
  },
};

const AgeGroupStore = () => {
  const { ageGroup } = useParams<{ ageGroup: string }>();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);

  const info = ageGroup ? AGE_GROUP_INFO[ageGroup] : null;

  useEffect(() => {
    loadProducts();
    loadCartCount();
  }, [ageGroup]);

  const loadProducts = async () => {
    if (!ageGroup || !info) return;
    
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("age_group", info.dbValue as any)
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Transform data to match expected format
      const transformedProducts = (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        price: Number(p.price),
        image_url: p.images?.[0] || p.image_url || null,
        product_type: p.product_type,
        download_link: p.download_link || null,
      }));
      
      setProducts(transformedProducts);
    } catch (error: any) {
      toast.error(`Error loading products: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadCartCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count } = await supabase
        .from("cart_items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      setCartCount(count || 0);
    } catch (error) {
      console.error("Error loading cart count:", error);
    }
  };

  if (!info) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Age group not found</h2>
          <Button onClick={() => navigate("/store")}>Back to Store</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/store")}
            aria-label="Back to store"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Store
          </Button>
          <h1 className="text-xl font-bold">
            {info.emoji} {info.title}
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/cart")}
            aria-label="View cart"
          >
            <ShoppingBag className="h-4 w-4 mr-2" />
            Cart {cartCount > 0 && `(${cartCount})`}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">{info.banner}</h2>
          <p className="text-muted-foreground">
            Curated products designed for your age group
          </p>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl text-muted-foreground mb-4">
              No products available yet in this category
            </p>
            <Button onClick={() => navigate("/store")}>
              Browse Other Categories
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={loadCartCount}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AgeGroupStore;
