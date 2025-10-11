import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Download, Play, FileText, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Entitlement {
  id: string;
  product_id: string;
  status: string;
  created_at: string;
  products: {
    id: string;
    name: string;
    description: string;
    images: string[] | null;
    product_type: "physical" | "digital";
    file_urls: string[] | null;
    preview_url: string | null;
  };
}

const Library = () => {
  const navigate = useNavigate();
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    loadLibrary();
  }, []);

  const loadLibrary = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("entitlements")
        .select(`
          id,
          product_id,
          status,
          created_at,
          products (
            id,
            name,
            description,
            images,
            product_type,
            file_urls,
            preview_url
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEntitlements(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading library",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      await loadLibrary();
      toast({
        title: "Library restored! ✅",
        description: "Your purchases have been refreshed",
      });
    } catch (error: any) {
      toast({
        title: "Error restoring",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRestoring(false);
    }
  };

  const handleDownload = async (fileUrl: string, productName: string) => {
    try {
      // In production, this would generate a signed URL
      window.open(fileUrl, "_blank");
      toast({
        title: "Download started",
        description: `${productName} is downloading`,
      });
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

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
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">My Library 📚</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRestore}
            disabled={restoring}
            aria-label="Restore purchases"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${restoring ? "animate-spin" : ""}`} />
            Restore
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {entitlements.length === 0 ? (
          <Card className="p-12 text-center max-w-md mx-auto">
            <div className="space-y-4">
              <p className="text-xl text-muted-foreground">Your library is empty</p>
              <p className="text-sm text-muted-foreground">
                Purchase digital products from the store to build your collection
              </p>
              <Button onClick={() => navigate("/store")}>
                Browse Store
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {entitlements.map((entitlement) => {
              const product = entitlement.products;
              return (
                <Card key={entitlement.id} className="overflow-hidden">
                  <div className="aspect-square bg-secondary/20 flex items-center justify-center">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-6xl">📱</span>
                    )}
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold line-clamp-1">{product.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        Added {new Date(entitlement.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {product.preview_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          asChild
                        >
                          <a href={product.preview_url} target="_blank" rel="noopener noreferrer">
                            <Play className="h-4 w-4 mr-2" />
                            Preview
                          </a>
                        </Button>
                      )}
                      {product.file_urls && product.file_urls.length > 0 && (
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => handleDownload(product.file_urls![0], product.name)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Library;