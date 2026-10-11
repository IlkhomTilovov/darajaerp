import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Settings, Plus, Pencil, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface StageManagementProps {
  onUpdate: () => void;
}

const COLOR_OPTIONS = [
  { value: 'bg-blue-500', label: 'Ko\'k' },
  { value: 'bg-green-500', label: 'Yashil' },
  { value: 'bg-red-500', label: 'Qizil' },
  { value: 'bg-orange-500', label: 'Apelsin' },
  { value: 'bg-purple-500', label: 'Binafsha' },
  { value: 'bg-pink-500', label: 'Pushti' },
  { value: 'bg-yellow-500', label: 'Sariq' },
  { value: 'bg-indigo-500', label: 'Indigo' },
  { value: 'bg-teal-500', label: 'Ko\'k-yashil' },
];

const StageManagement = ({ onUpdate }: StageManagementProps) => {
  const [open, setOpen] = useState(false);
  const [stages, setStages] = useState<any[]>([]);
  const [editingStage, setEditingStage] = useState<any>(null);
  const [deleteStageId, setDeleteStageId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    color: "bg-blue-500",
    display_order: 1
  });

  useEffect(() => {
    if (open) {
      fetchStages();
    }
  }, [open]);

  const fetchStages = async () => {
    try {
      const data = await api.stages.list();
      setStages(data.sort((a: any, b: any) => a.display_order - b.display_order));
    } catch (error) {
      console.error("Error fetching stages:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Bosqich nomini kiriting");
      return;
    }

    try {
      if (editingStage) {
        await api.stages.update(editingStage.id, {
          name: formData.name,
          color: formData.color,
          display_order: formData.display_order,
        });
        toast.success("Bosqich yangilandi");
      } else {
        await api.stages.create({
          name: formData.name,
          color: formData.color,
          display_order: formData.display_order,
        });
        toast.success("Bosqich qo'shildi");
      }

      setFormData({ name: "", color: "bg-blue-500", display_order: 1 });
      setEditingStage(null);
      fetchStages();
      onUpdate();
    } catch (error) {
      console.error("Error saving stage:", error);
      toast.error("Bosqichni saqlashda xato");
    }
  };

  const handleEdit = (stage: any) => {
    setEditingStage(stage);
    setFormData({
      name: stage.name,
      color: stage.color,
      display_order: stage.display_order
    });
  };

  const handleDelete = async () => {
    if (!deleteStageId) return;

    try {
      await api.stages.remove(deleteStageId);

      toast.success("Bosqich o'chirildi");
      setDeleteStageId(null);
      fetchStages();
      onUpdate();
    } catch (error) {
      console.error("Error deleting stage:", error);
      toast.error("Bosqichni o'chirishda xato");
    }
  };

  const cancelEdit = () => {
    setEditingStage(null);
    setFormData({ name: "", color: "bg-blue-500", display_order: 1 });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Bosqichlarni boshqarish
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bosqichlarni boshqarish</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <div>
              <Label htmlFor="name">Bosqich nomi *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Bosqich nomini kiriting"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="color">Rang</Label>
                <Select
                  value={formData.color}
                  onValueChange={(value) => setFormData({ ...formData, color: value })}
                >
                  <SelectTrigger>
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

              <div>
                <Label htmlFor="display_order">Tartib raqami</Label>
                <Input
                  id="display_order"
                  type="number"
                  min="1"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              {editingStage && (
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  Bekor qilish
                </Button>
              )}
              <Button type="submit">
                {editingStage ? "Yangilash" : "Qo'shish"}
              </Button>
            </div>
          </form>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Mavjud bosqichlar</h3>
            <div className="space-y-2">
              {stages.map((stage) => (
                <div
                  key={stage.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded ${stage.color}`} />
                    <div>
                      <p className="font-medium">{stage.name}</p>
                      <p className="text-xs text-muted-foreground">Tartib: {stage.display_order}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(stage)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeleteStageId(stage.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteStageId} onOpenChange={() => setDeleteStageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bosqichni o'chirish</AlertDialogTitle>
            <AlertDialogDescription>
              Ushbu bosqichni o'chirishga ishonchingiz komilmi? Bu amal bekor qilinmaydi.
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

export default StageManagement;