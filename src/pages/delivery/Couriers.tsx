import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Bike, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const Couriers = () => {
  const { isAdminOrRop } = useUserRoles();
  const [couriers, setCouriers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourier, setEditingCourier] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", phone: "" });

  useEffect(() => {
    fetchCouriers();
  }, []);

  const fetchCouriers = async () => {
    try {
      const data = await api.couriers.list();
      setCouriers(data.sort((a: any, b: any) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error("Error fetching couriers:", error);
      toast.error("Kuryerlarni yuklashda xato");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Kuryer ismini kiriting");
      return;
    }

    try {
      if (editingCourier) {
        await api.couriers.update(editingCourier.id, { name: formData.name, phone: formData.phone || null });
        toast.success("Kuryer yangilandi");
      } else {
        await api.couriers.create({ name: formData.name, phone: formData.phone || null });
        toast.success("Kuryer qo'shildi");
      }
      closeDialog();
      fetchCouriers();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Kuryerni saqlashda xato");
    }
  };

  const handleEdit = (courier: any) => {
    setEditingCourier(courier);
    setFormData({ name: courier.name, phone: courier.phone || "" });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.couriers.remove(deleteId);
      toast.success("Kuryer o'chirildi");
      setDeleteId(null);
      fetchCouriers();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Kuryerni o'chirishda xato");
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingCourier(null);
    setFormData({ name: "", phone: "" });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bike className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Kuryerlar</h1>
              <p className="text-muted-foreground">Dastavka kuryerlari ro'yxati</p>
            </div>
          </div>

          {isAdminOrRop && (
            <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
              <DialogTrigger asChild>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Kuryer qo'shish
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[420px]">
                <DialogHeader>
                  <DialogTitle>{editingCourier ? "Kuryerni tahrirlash" : "Yangi kuryer qo'shish"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="courier-name">Ism *</Label>
                    <Input
                      id="courier-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Kuryer ismini kiriting"
                    />
                  </div>
                  <div>
                    <Label htmlFor="courier-phone">Telefon</Label>
                    <Input
                      id="courier-phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+998 XX XXX XX XX"
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    {editingCourier ? "Yangilash" : "Qo'shish"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ism</TableHead>
                <TableHead>Telefon</TableHead>
                {isAdminOrRop && <TableHead className="text-right">Amallar</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                    Yuklanmoqda...
                  </TableCell>
                </TableRow>
              ) : couriers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                    Hozircha kuryer yo'q
                  </TableCell>
                </TableRow>
              ) : (
                couriers.map((courier) => (
                  <TableRow key={courier.id}>
                    <TableCell className="font-medium">{courier.name}</TableCell>
                    <TableCell className="text-muted-foreground">{courier.phone || "—"}</TableCell>
                    {isAdminOrRop && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(courier)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setDeleteId(courier.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kuryerni o'chirish</AlertDialogTitle>
            <AlertDialogDescription>Ushbu kuryerni o'chirishga ishonchingiz komilmi? Bu amal bekor qilinmaydi.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>O'chirish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Couriers;
