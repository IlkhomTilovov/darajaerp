import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const Products = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const { isAdmin } = useUserRole();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await api.products.list();
      setProducts(data.sort((a: any, b: any) => (a.created_at < b.created_at ? 1 : -1)));
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Mahsulotlarni yuklashda xato");
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const { url } = await api.uploads.upload(file);
      return url;
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Rasm yuklashda xato");
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let imageUrl: string | null = editingProduct?.image_url || null;

      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
        if (!imageUrl) return;
      }

      const productData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        image_url: imageUrl,
      };

      if (editingProduct) {
        await api.products.update(editingProduct.id, productData);
        toast.success("Mahsulot yangilandi!");
      } else {
        await api.products.create(productData);
        toast.success("Mahsulot qo'shildi!");
      }

      setDialogOpen(false);
      setEditingProduct(null);
      setFormData({ name: "", description: "", price: "" });
      setImageFile(null);
      fetchProducts();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Xatolik yuz berdi");
    }
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
    });
    setDialogOpen(true);
  };

  const handleDelete = async (productId: string) => {
    if (!confirm("Mahsulotni o'chirishni xohlaysizmi?")) return;

    try {
      await api.products.remove(productId);
      toast.success("Mahsulot o'chirildi!");
      fetchProducts();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Xatolik yuz berdi");
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingProduct(null);
    setFormData({ name: "", description: "", price: "" });
    setImageFile(null);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center text-muted-foreground">Yuklanmoqda...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-4xl font-bold tracking-tight text-foreground">
              Mahsulotlar
            </h2>
            <p className="text-muted-foreground mt-2">
              Barcha mahsulotlar ro'yxati
            </p>
          </div>
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                    size="lg"
                    className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all px-6 py-6 text-base font-semibold"
                    onClick={closeDialog}
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Mahsulot qo'shish
                  </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle className="text-2xl">
                      {editingProduct ? "Mahsulotni tahrirlash" : "Yangi mahsulot qo'shish"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-5 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-base font-semibold">Mahsulot nomi</Label>
                      <Input
                        id="name"
                        placeholder="Mahsulot nomini kiriting"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-base font-semibold">Tavsif</Label>
                      <Textarea
                        id="description"
                        placeholder="Mahsulot haqida ma'lumot"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={4}
                        className="resize-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price" className="text-base font-semibold">Narxi (so'm)</Label>
                      <Input
                        id="price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        required
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="image" className="text-base font-semibold">Mahsulot rasmi</Label>
                      <Input
                        id="image"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                        className="h-11 cursor-pointer"
                      />
                      {editingProduct?.image_url && !imageFile && (
                        <p className="text-sm text-muted-foreground">Mavjud rasm saqlanadi</p>
                      )}
                    </div>
                    <Button type="submit" size="lg" className="w-full h-12 text-base font-semibold">
                      {editingProduct ? "Yangilash" : "Saqlash"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.length === 0 ? (
            <div className="col-span-full text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4">
                <Plus className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-lg">Hozircha mahsulot yo'q</p>
            </div>
          ) : (
            products.map((product) => (
              <Card key={product.id} className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/20">
                <div className="relative">
                  {product.image_url ? (
                    <div className="aspect-square relative overflow-hidden bg-gradient-to-br from-muted to-muted/50">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                      <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-background/50 mb-2">
                          <Plus className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <span className="text-muted-foreground text-sm block">Rasm yo'q</span>
                      </div>
                    </div>
                  )}
                </div>
                <CardContent className="p-5">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-bold text-lg line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                        {product.name}
                      </h3>
                      {product.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>
                      )}
                    </div>
                    <div className="pt-3 border-t">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                          {parseFloat(product.price).toLocaleString()}
                        </span>
                        <span className="text-sm text-muted-foreground font-medium">so'm</span>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-9 font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
                            onClick={() => handleEdit(product)}
                          >
                            <Pencil className="h-4 w-4 mr-1.5" />
                            Tahrirlash
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-9 w-9 p-0"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Products;
