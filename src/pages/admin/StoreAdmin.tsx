import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Package, Search, Store as StoreIcon, Upload, X, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";

type AgeGroup = Database["public"]["Enums"]["age_group"];

interface StoreProduct {
  id: string;
  sku: string | null;
  name: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  image_url: string | null;
  stock: number;
  category: string | null;
  age_group: AgeGroup;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function StoreAdmin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<AgeGroup>("adult");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StoreProduct | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const ITEMS_PER_PAGE = 20;

  const ageGroups: { value: AgeGroup; label: string; emoji: string }[] = [
    { value: "child", label: "Kids Store", emoji: "🧒" },
    { value: "teen", label: "Teens Store", emoji: "🧑‍🎓" },
    { value: "adult", label: "Adults Store", emoji: "🧍" },
    { value: "elder", label: "Elders Store", emoji: "👵" },
  ];

  // Form state
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    description: "",
    price: "",
    compare_at_price: "",
    category: "",
    age_group: "adult" as AgeGroup,
    stock: "0",
    is_active: true,
  });

  // Fetch products
  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-store-products", searchQuery, selectedAgeGroup, currentPage],
    queryFn: async () => {
      let query = supabase
        .from("store_products")
        .select("*")
        .eq("age_group", selectedAgeGroup)
        .order("created_at", { ascending: false });

      if (searchQuery) {
        query = query.ilike("name", `%${searchQuery}%`);
      }

      const { data, error } = await query
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

      if (error) throw error;
      return data as StoreProduct[];
    },
  });

  // Log admin action
  const logAdminAction = async (event: string, metadata: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("admin_audit_logs").insert({
        admin_id: user.id,
        event,
        metadata
      });
    }
  };

  // Upload image to storage
  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (newProduct: Partial<StoreProduct> & { name: string; price: number }) => {
      // Upload image if selected
      let imageUrl = imagePreview;
      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile);
        if (!uploadedUrl) throw new Error("Image upload failed");
        imageUrl = uploadedUrl;
      }

      const { data, error } = await supabase
        .from("store_products")
        .insert([{
          name: newProduct.name,
          price: newProduct.price,
          description: newProduct.description || null,
          sku: newProduct.sku || `SKU-${Date.now()}`,
          category: newProduct.category || null,
          age_group: newProduct.age_group || selectedAgeGroup,
          compare_at_price: newProduct.compare_at_price || null,
          stock: newProduct.stock || 0,
          is_active: newProduct.is_active !== undefined ? newProduct.is_active : true,
          image_url: imageUrl || null,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-store-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-store-stats"] });
      toast.success("Product created successfully");
      logAdminAction("add_product", { product_id: data.id, product_name: data.name });
      resetForm();
      setIsAddModalOpen(false);
    },
    onError: (error: any) => {
      toast.error("Failed to create product: " + error.message);
    },
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async (updatedProduct: Partial<StoreProduct> & { id: string }) => {
      const { id, ...updates } = updatedProduct;
      
      // Upload new image if selected
      let imageUrl = updates.image_url;
      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile);
        if (!uploadedUrl) throw new Error("Image upload failed");
        imageUrl = uploadedUrl;
      }
      
      const { data, error } = await supabase
        .from("store_products")
        .update({ ...updates, image_url: imageUrl })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-store-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-store-stats"] });
      toast.success("Product updated successfully");
      logAdminAction("edit_product", { product_id: data.id, product_name: data.name });
      resetForm();
      setEditingProduct(null);
    },
    onError: (error: any) => {
      toast.error("Failed to update product: " + error.message);
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("store_products")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["admin-store-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-store-stats"] });
      toast.success("Product deleted successfully");
      logAdminAction("remove_product", { product_id: id });
    },
    onError: (error: any) => {
      toast.error("Failed to delete product: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      sku: "",
      name: "",
      description: "",
      price: "",
      compare_at_price: "",
      category: "",
      age_group: selectedAgeGroup,
      stock: "0",
      is_active: true,
    });
    setImageFile(null);
    setImagePreview("");
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (product: StoreProduct) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku || "",
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      compare_at_price: product.compare_at_price?.toString() || "",
      category: product.category || "",
      age_group: product.age_group,
      stock: product.stock.toString(),
      is_active: product.is_active,
    });
    setImagePreview(product.image_url || "");
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.price) {
      toast.error("Name and price are required");
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) {
      toast.error("Please enter a valid price");
      return;
    }

    const productData = {
      sku: formData.sku,
      name: formData.name,
      description: formData.description || null,
      price: price,
      compare_at_price: formData.compare_at_price ? parseFloat(formData.compare_at_price) : null,
      category: formData.category || null,
      age_group: formData.age_group,
      stock: parseInt(formData.stock) || 0,
      is_active: formData.is_active,
      image_url: imagePreview || null,
    };

    if (editingProduct) {
      updateProductMutation.mutate({
        id: editingProduct.id,
        ...productData
      });
    } else {
      createProductMutation.mutate({
        ...productData,
        name: formData.name,
        price: price,
      });
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteProductMutation.mutate(id);
    }
  };

  return (
    <AdminGuard>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/admin")}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Package className="h-8 w-8" />
              Store Merchandise Management
            </h1>
            <p className="text-muted-foreground">
              Manage products, inventory, and pricing
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/store")} variant="outline">
              <StoreIcon className="h-4 w-4 mr-2" />
              View Public Store
            </Button>
            <Button onClick={handleOpenAddModal}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Age Group Tabs */}
        <Tabs value={selectedAgeGroup} onValueChange={(value) => {
          setSelectedAgeGroup(value as AgeGroup);
          setCurrentPage(1);
        }}>
          <TabsList className="grid w-full grid-cols-4">
            {ageGroups.map((group) => (
              <TabsTrigger key={group.value} value={group.value}>
                {group.emoji} {group.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {ageGroups.map((group) => (
            <TabsContent key={group.value} value={group.value} className="space-y-4">
              {/* Search */}
              <Card>
                <CardHeader>
                  <CardTitle>Search {group.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by product name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Products List */}
              <Card>
                <CardHeader>
                  <CardTitle>{group.label} Products</CardTitle>
                  <CardDescription>
                    {products?.length || 0} products found
                  </CardDescription>
                </CardHeader>
                <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : products && products.length > 0 ? (
              <div className="space-y-4">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                          <Package className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{product.name}</h3>
                          <Badge variant={product.is_active ? "default" : "secondary"}>
                            {product.is_active ? "Active" : "Inactive"}
                          </Badge>
                          {product.category && (
                            <Badge variant="outline">{product.category}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {product.description || "No description"}
                        </p>
                        <div className="flex gap-4 text-sm mt-1">
                          <span className="font-medium">${product.price.toFixed(2)}</span>
                          {product.compare_at_price && (
                            <span className="text-muted-foreground line-through">
                              ${product.compare_at_price.toFixed(2)}
                            </span>
                          )}
                          <span className="text-muted-foreground">Stock: {product.stock}</span>
                          {product.sku && (
                            <span className="text-muted-foreground">SKU: {product.sku}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEditModal(product)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(product.id, product.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No products found. Add your first product to get started.
              </div>
            )}
                </CardContent>
              </Card>

              {/* Pagination */}
              {products && products.length === ITEMS_PER_PAGE && (
                <div className="flex justify-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(p => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Add/Edit Modal */}
        <Dialog open={isAddModalOpen || !!editingProduct} onOpenChange={(open) => {
          if (!open) {
            setIsAddModalOpen(false);
            setEditingProduct(null);
            resetForm();
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Edit Product" : "Add New Product"}
              </DialogTitle>
              <DialogDescription>
                {editingProduct ? "Update product information" : "Create a new product for your store"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Image Upload */}
              <div>
                <Label>Product Image</Label>
                <div className="mt-2 space-y-2">
                  {imagePreview && (
                    <div className="relative w-full h-48 border rounded-lg overflow-hidden">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview("");
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      disabled={uploading}
                    />
                    <Upload className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Maximum file size: 5MB. Supported formats: JPG, PNG, WEBP
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter product name"
                  />
                </div>
                <div>
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="Auto-generated if empty"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter product description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="price">Price ($) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="compare_at_price">Compare At Price ($)</Label>
                  <Input
                    id="compare_at_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.compare_at_price}
                    onChange={(e) => setFormData({ ...formData, compare_at_price: e.target.value })}
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <Label htmlFor="stock">Stock Quantity</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g. Clothing, Electronics, Books"
                  />
                </div>

                <div>
                  <Label htmlFor="age_group">Age Group *</Label>
                  <Select
                    value={formData.age_group}
                    onValueChange={(value: AgeGroup) => setFormData({ ...formData, age_group: value })}
                  >
                    <SelectTrigger id="age_group">
                      <SelectValue placeholder="Select age group" />
                    </SelectTrigger>
                    <SelectContent>
                      {ageGroups.map((group) => (
                        <SelectItem key={group.value} value={group.value}>
                          {group.emoji} {group.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active (visible in store)</Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingProduct(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createProductMutation.isPending || updateProductMutation.isPending || uploading}
              >
                {uploading ? "Uploading..." : editingProduct ? "Update Product" : "Create Product"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminGuard>
  );
}
