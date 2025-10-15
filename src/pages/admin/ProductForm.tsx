import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Upload, X, GripVertical, Save } from "lucide-react";

interface ProductFormData {
  title: string;
  subtitle: string;
  slug: string;
  description: string;
  price_cents: number;
  compare_at_cents: number;
  category: string;
  tags: string[];
  type: string;
  sku: string;
  stock: number;
  is_active: boolean;
  weight_grams: number;
  dimensions_cm: { length: number; width: number; height: number } | null;
  shipping_profile: string;
}

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tagInput, setTagInput] = useState("");
  
  const [formData, setFormData] = useState<ProductFormData>({
    title: "",
    subtitle: "",
    slug: "",
    description: "",
    price_cents: 0,
    compare_at_cents: 0,
    category: "adults",
    tags: [],
    type: "physical",
    sku: "",
    stock: 0,
    is_active: false,
    weight_grams: 0,
    dimensions_cm: null,
    shipping_profile: "",
  });

  const [images, setImages] = useState<Array<{ id?: string; url: string; is_cover: boolean; sort_order: number }>>([]);
  const [digitalFiles, setDigitalFiles] = useState<Array<{ id?: string; file_name: string; file_path: string }>>([]);

  useEffect(() => {
    if (id) {
      loadProduct();
    }
  }, [id]);

  const loadProduct = async () => {
    try {
      const { data: product, error: productError } = await supabase
        .from("products" as any)
        .select("*")
        .eq("id", id)
        .single();

      if (productError) throw productError;

      const productData = product as any;

      setFormData({
        title: productData.title,
        subtitle: productData.subtitle || "",
        slug: productData.slug,
        description: productData.description || "",
        price_cents: productData.price_cents,
        compare_at_cents: productData.compare_at_cents || 0,
        category: productData.category,
        tags: productData.tags || [],
        type: productData.type,
        sku: productData.sku || "",
        stock: productData.stock || 0,
        is_active: productData.is_active,
        weight_grams: productData.weight_grams || 0,
        dimensions_cm: productData.dimensions_cm || null,
        shipping_profile: productData.shipping_profile || "",
      });

      const { data: imageData } = await supabase
        .from("product_images" as any)
        .select("*")
        .eq("product_id", id)
        .order("sort_order");

      if (imageData) {
        setImages(imageData.map((img: any) => ({
          id: img.id,
          url: img.url,
          is_cover: img.is_cover,
          sort_order: img.sort_order,
        })));
      }

      const { data: assetData } = await supabase
        .from("digital_assets" as any)
        .select("*")
        .eq("product_id", id);

      if (assetData) {
        setDigitalFiles(assetData.map((asset: any) => ({
          id: asset.id,
          file_name: asset.file_name,
          file_path: asset.file_path,
        })));
      }
    } catch (error) {
      console.error("Error loading product:", error);
      toast.error("Failed to load product");
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title),
    }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  };

  const handleImageUpload = async (files: FileList) => {
    setUploading(true);
    try {
      const uploadedImages = [];
      
      for (const file of Array.from(files)) {
        if (file.size > 2097152) {
          toast.error(`${file.name} is too large. Max size is 2MB.`);
          continue;
        }

        const fileExt = file.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError, data } = await supabase.storage
          .from("store-images")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("store-images")
          .getPublicUrl(filePath);

        uploadedImages.push({
          url: publicUrl,
          is_cover: images.length === 0,
          sort_order: images.length + uploadedImages.length,
        });
      }

      setImages(prev => [...prev, ...uploadedImages]);
      toast.success("Images uploaded successfully");
    } catch (error) {
      console.error("Error uploading images:", error);
      toast.error("Failed to upload images");
    } finally {
      setUploading(false);
    }
  };

  const handleDigitalFileUpload = async (files: FileList) => {
    setUploading(true);
    try {
      const uploadedFiles = [];

      for (const file of Array.from(files)) {
        const fileName = file.name;
        const filePath = `${Math.random()}-${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("store-digital")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        uploadedFiles.push({
          file_name: fileName,
          file_path: filePath,
        });
      }

      setDigitalFiles(prev => [...prev, ...uploadedFiles]);
      toast.success("Digital files uploaded successfully");
    } catch (error) {
      console.error("Error uploading digital files:", error);
      toast.error("Failed to upload digital files");
    } finally {
      setUploading(false);
    }
  };

  const createOrUpdateStripeProduct = async (productId: string, existingStripeProductId?: string, existingStripePriceId?: string) => {
    try {
      // Call edge function to handle Stripe operations
      const { data, error } = await supabase.functions.invoke("create-product-stripe", {
        body: {
          productId,
          title: formData.title,
          description: formData.description,
          price_cents: formData.price_cents,
          category: formData.category,
          existingStripeProductId,
          existingStripePriceId,
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error with Stripe:", error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let productId = id;
      let existingStripeProductId = null;
      let existingStripePriceId = null;

      if (id) {
        // Get existing Stripe IDs before update
        const { data: existingProduct } = await supabase
          .from("products" as any)
          .select("stripe_product_id, stripe_price_id")
          .eq("id", id)
          .single();

        existingStripeProductId = (existingProduct as any)?.stripe_product_id;
        existingStripePriceId = (existingProduct as any)?.stripe_price_id;

        const { error } = await supabase
          .from("products" as any)
          .update(formData as any)
          .eq("id", id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("products" as any)
          .insert([formData as any])
          .select()
          .single();

        if (error) throw error;
        productId = (data as any).id;
      }

      // Create/update Stripe product and price if publishing
      if (formData.is_active && productId) {
        try {
          const stripeData = await createOrUpdateStripeProduct(
            productId,
            existingStripeProductId,
            existingStripePriceId
          );

          // Update product with Stripe IDs
          await supabase
            .from("products" as any)
            .update({
              stripe_product_id: stripeData.productId,
              stripe_price_id: stripeData.priceId,
            } as any)
            .eq("id", productId);

          toast.success("Stripe product created/updated");
        } catch (stripeError) {
          console.error("Stripe error:", stripeError);
          toast.error("Product saved but Stripe integration failed");
        }
      }

      // Save images
      if (productId) {
        // Delete existing images if updating
        if (id) {
          await supabase
            .from("product_images" as any)
            .delete()
            .eq("product_id", productId);
        }

        // Insert new images
        if (images.length > 0) {
          await supabase
            .from("product_images" as any)
            .insert(
              images.map((img, idx) => ({
                product_id: productId,
                url: img.url,
                is_cover: img.is_cover,
                sort_order: idx,
              })) as any
            );
        }

        // Save digital assets for digital products
        if (formData.type === "digital" && digitalFiles.length > 0) {
          if (id) {
            await supabase
              .from("digital_assets" as any)
              .delete()
              .eq("product_id", productId);
          }

          await supabase
            .from("digital_assets" as any)
            .insert(
              digitalFiles.map(file => ({
                product_id: productId,
                file_path: file.file_path,
                file_name: file.file_name,
              })) as any
            );
        }
      }

      toast.success(id ? "Product updated" : "Product created");
      navigate("/admin/products");
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Failed to save product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="container mx-auto max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin/products")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Products
        </Button>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{id ? "Edit Product" : "New Product"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtitle">Subtitle</Label>
                <Input
                  id="subtitle"
                  value={formData.subtitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger id="category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kids">Kids</SelectItem>
                      <SelectItem value="teens">Teens</SelectItem>
                      <SelectItem value="adults">Adults</SelectItem>
                      <SelectItem value="elders">Elders</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="physical">Physical</SelectItem>
                      <SelectItem value="digital">Digital</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="age_restriction">Age Restriction</Label>
                <Select
                  value={(formData as any).age_restriction || 'all'}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, age_restriction: value } as any))}
                >
                  <SelectTrigger id="age_restriction">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ages</SelectItem>
                    <SelectItem value="teen">Teen+ (13+)</SelectItem>
                    <SelectItem value="adult">Adult Only (18+)</SelectItem>
                    <SelectItem value="elder">Elder (60+)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Restrict who can view and purchase this product
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (cents) *</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price_cents}
                    onChange={(e) => setFormData(prev => ({ ...prev, price_cents: parseInt(e.target.value) }))}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    ${(formData.price_cents / 100).toFixed(2)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="compare_at">Compare At (cents)</Label>
                  <Input
                    id="compare_at"
                    type="number"
                    value={formData.compare_at_cents}
                    onChange={(e) => setFormData(prev => ({ ...prev, compare_at_cents: parseInt(e.target.value) }))}
                  />
                  {formData.compare_at_cents > 0 && (
                    <p className="text-xs text-muted-foreground">
                      ${(formData.compare_at_cents / 100).toFixed(2)}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <div className="flex gap-2">
                  <Input
                    id="tags"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                    placeholder="Add a tag..."
                  />
                  <Button type="button" onClick={handleAddTag} variant="outline">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveTag(tag)} />
                    </Badge>
                  ))}
                </div>
              </div>

              {formData.type === "physical" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sku">SKU</Label>
                      <Input
                        id="sku"
                        value={formData.sku}
                        onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stock">Stock</Label>
                      <Input
                        id="stock"
                        type="number"
                        value={formData.stock}
                        onChange={(e) => setFormData(prev => ({ ...prev, stock: parseInt(e.target.value) }))}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_active">Active</Label>
                  <p className="text-xs text-muted-foreground">
                    Make this product visible to customers
                  </p>
                </div>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="images">Upload Images (max 2MB each)</Label>
                <Input
                  id="images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                  disabled={uploading}
                  className="mt-2"
                />
              </div>

              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg border overflow-hidden group">
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                      {img.is_cover && (
                        <Badge className="absolute top-2 left-2">Cover</Badge>
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {formData.type === "digital" && (
            <Card>
              <CardHeader>
                <CardTitle>Digital Files</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="files">Upload Digital Files</Label>
                  <Input
                    id="files"
                    type="file"
                    multiple
                    onChange={(e) => e.target.files && handleDigitalFileUpload(e.target.files)}
                    disabled={uploading}
                    className="mt-2"
                  />
                </div>

                {digitalFiles.length > 0 && (
                  <div className="space-y-2">
                    {digitalFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="text-sm">{file.file_name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setDigitalFiles(prev => prev.filter((_, i) => i !== idx))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/admin/products")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Saving..." : id ? "Update Product" : "Create Product"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}