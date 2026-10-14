import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface DeliveryStatusManagementProps {
  onUpdate: () => void;
}

const COLOR_OPTIONS = [
  { value: "bg-blue-500", label: "Ko'k" },
  { value: "bg-green-500", label: "Yashil" },
  { value: "bg-red-500", label: "Qizil" },
  { value: "bg-orange-500", label: "Apelsin" },
  { value: "bg-purple-500", label: "Binafsha" },
  { value: "bg-pink-500", label: "Pushti" },
  { value: "bg-yellow-500", label: "Sariq" },
  { value: "bg-indigo-500", label: "Indigo" },
  { value: "bg-teal-500", label: "Ko'k-yashil" },
];

const DeliveryStatusManagement = ({ onUpdate }: DeliveryStatusManagementProps) => {
  const [open, setOpen] = useState(false);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [editingStatus, setEditingStatus] = useState<any>(null);
  const [deleteStatusId, setDeleteStatusId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", color: "bg-blue-500" });

  useEffect(() => {
    if (open) fetchStatuses();
  }, [open]);

  const fetchStatuses = async () => {
    try {
      const data = await api.deliveryStatuses.list();
      setStatuses(data.sort((a: any, b: any) => a.display_order - b.display_order));
    } catch (error) {
      console.error("Error fetching delivery statuses:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Ustun nomini kiriting");
      return;
    }

    try {
      if (editingStatus) {
        await api.deliveryStatuses.update(editingStatus.id, { name: formData.name, color: formData.color });
        toast.success("Ustun yangilandi");
      } else {
        const displayOrder = statuses.length > 0 ? Math.max(...statuses.map((s) => s.display_order)) + 1 : 1;
        await api.deliveryStatuses.create({ name: formData.name, color: formData.color, display_order: displayOrder });
        toast.success("Ustun qo'shildi");
      }

      setFormData({ name: "", color: "bg-blue-500" });
      setEditingStatus(null);
      fetchStatuses();
      onUpdate();
    } catch (error) {
      console.error("Error saving delivery status:", error);
      toast.error("Ustunni saqlashda xato");
    }
  };

  const handleEdit = (status: any) => {
    setEditingStatus(status);
    setFormData({ name: status.name, color: status.color });
  };

  const handleDelete = async () => {
    if (!deleteStatusId) return;

    try {
      await api.deliveryStatuses.remove(deleteStatusId);
      toast.success("Ustun o'chirildi");
      setDeleteStatusId(null);
      fetchStatuses();
      onUpdate();
    } catch (error) {
      console.error("Error deleting delivery status:", error);
      toast.error("Ustunni o'chirishda xato");
    }
  };

  const cancelEdit = () => {
    setEditingStatus(null);
    setFormData({ name: "", color: "bg-blue-500" });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Ustun qo'shish
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dastavka ustunlarini boshqarish</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <div>
              <Label htmlFor="delivery-status-name">Ustun nomi *</Label>
              <Input
                id="delivery-status-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ustun nomini kiriting"
              />
            </div>

            <div>
              <Label htmlFor="delivery-status-color">Rang</Label>
              <Select value={formData.color} onValueChange={(value) => setFormData({ ...formData, color: value })}>
                <SelectTrigger id="delivery-status-color">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded ${color.value}`} />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 justify-end">
              {editingStatus && (
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  Bekor qilish
                </Button>
              )}
              <Button type="submit">{editingStatus ? "Yangilash" : "Qo'shish"}</Button>
            </div>
          </form>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Qo'shimcha ustunlar</h3>
            {statuses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Hali qo'shimcha ustun yo'q</p>
            ) : (
              <div className="space-y-2">
                {statuses.map((status) => (
                  <div key={status.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded ${status.color}`} />
                      <p className="font-medium">{status.name}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(status)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setDeleteStatusId(status.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteStatusId} onOpenChange={() => setDeleteStatusId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ustunni o'chirish</AlertDialogTitle>
            <AlertDialogDescription>
              Ushbu ustunni o'chirishga ishonchingiz komilmi? Agar bu ustunda buyurtmalar bo'lsa, ular hech qaysi ustunda ko'rinmay qoladi (ma'lumotlari saqlanib qoladi, lekin topish qiyinlashadi). Avval ularni boshqa ustunga ko'chirib qo'yish tavsiya etiladi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>O'chirish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DeliveryStatusManagement;
