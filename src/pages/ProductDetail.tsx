import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ShoppingCart, Star, Play, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[] | null;
  product_type: "physical" | "digital";
  age_group: "child" | "teen" | "adult" | "elder";
  tags: string[] | null;
  preview_url: string | null;
}

interface Review {
  id: string;
  rating: number;
  text: string;
  user_public_name: string;
  created_at: string;
}

const ProductDetail = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    if (!productId) return;
    
    try {
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .eq("active", true)
        .single();

      if (productError) throw productError;
      setProduct(productData);

      // Load reviews
      const { data: reviewsData } = await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .limit(10);
      setReviews(reviewsData || []);

      // Load related products (same age group and tags)
      if (productData) {
        const { data: relatedData } = await supabase
          .from("products")
          .select("*")
          .eq("age_group", productData.age_group)
          .eq("active", true)
          .neq("id", productId)
          .limit(4);
        setRelatedProducts(relatedData || []);
      }
    } catch (error: any) {
      toast({
        title: "Error loading product",
        description: error.message,
        variant: "destructive",
      });
      navigate("/store");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    setAddingToCart(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Please sign in",
          description: "You need to be signed in to add items to cart",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      // Check if user needs parent approval (kids age group)
      const { data: profile } = await supabase
        .from("profiles")
        .select("age_group, parent_id")
        .eq("id", user.id)
        .single();

      if (profile?.age_group === "child" && profile?.parent_id) {
        // Create purchase request for parent approval
        const { error } = await supabase
          .from("purchase_requests")
          .insert({
            child_id: user.id,
            parent_id: profile.parent_id,
            product_id: productId,
            status: "pending",
          });

        if (error) throw error;

        toast({
          title: "Approval requested! 📨",
          description: "Your parent will review this purchase request",
        });
        return;
      }

      // Regular add to cart
      const { error } = await supabase
        .from("cart_items")
        .upsert({
          user_id: user.id,
          product_id: productId!,
          quantity: 1,
        }, {
          onConflict: "user_id,product_id",
        });

      if (error) throw error;

      toast({
        title: "Added to cart! 🛒",
        description: `${product?.name} has been added to your cart`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAddingToCart(false);
    }
  };

  const averageRating = reviews.length > 0
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!product) return null;

  const images = product.images || [];

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

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="aspect-square bg-secondary/20 rounded-lg overflow-hidden">
              {images.length > 0 ? (
                <img
                  src={images[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl">
                  {product.product_type === "digital" ? "📱" : "📦"}
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`aspect-square rounded border-2 overflow-hidden ${
                      selectedImage === idx ? "border-primary" : "border-transparent"
                    }`}
                  >
                    <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <div className="flex gap-2 mb-3">
                <Badge>{product.age_group}</Badge>
                <Badge variant="outline">{product.product_type}</Badge>
              </div>
              <h1 className="text-4xl font-bold mb-2">{product.name}</h1>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${
                        star <= averageRating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  ({reviews.length} reviews)
                </span>
              </div>
              <p className="text-3xl font-bold text-primary">${product.price}</p>
            </div>

            <p className="text-muted-foreground">{product.description}</p>

            {product.tags && product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            )}

            {product.preview_url && (
              <Card className="p-4">
                <h3 className="font-semibold mb-2">Preview</h3>
                {product.product_type === "digital" && product.preview_url.includes("audio") ? (
                  <audio controls className="w-full">
                    <source src={product.preview_url} />
                  </audio>
                ) : (
                  <Button variant="outline" size="sm" asChild>
                    <a href={product.preview_url} target="_blank" rel="noopener noreferrer">
                      <FileText className="h-4 w-4 mr-2" />
                      View Preview
                    </a>
                  </Button>
                )}
              </Card>
            )}

            <Button
              size="lg"
              className="w-full"
              onClick={handleAddToCart}
              disabled={addingToCart}
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              {addingToCart ? "Adding..." : "Add to Cart"}
            </Button>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="max-w-6xl mx-auto mt-12">
          <Tabs defaultValue="reviews">
            <TabsList>
              <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
              <TabsTrigger value="related">You May Also Like</TabsTrigger>
            </TabsList>
            <TabsContent value="reviews" className="space-y-4">
              {reviews.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No reviews yet. Be the first to review!</p>
                </Card>
              ) : (
                reviews.map((review) => (
                  <Card key={review.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold">{review.user_public_name}</p>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{review.text}</p>
                  </Card>
                ))
              )}
            </TabsContent>
            <TabsContent value="related">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {relatedProducts.map((relatedProduct) => (
                  <Card
                    key={relatedProduct.id}
                    className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => navigate(`/store/product/${relatedProduct.id}`)}
                  >
                    <div className="aspect-square bg-secondary/20 flex items-center justify-center">
                      {relatedProduct.images?.[0] ? (
                        <img
                          src={relatedProduct.images[0]}
                          alt={relatedProduct.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-6xl">
                          {relatedProduct.product_type === "digital" ? "📱" : "📦"}
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold line-clamp-1">{relatedProduct.name}</h3>
                      <p className="text-xl font-bold text-primary">${relatedProduct.price}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default ProductDetail;