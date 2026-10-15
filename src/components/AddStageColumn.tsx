import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

interface AddStageColumnProps {
  nextDisplayOrder: number;
  onAdded: () => void;
}

const COLOR_OPTIONS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-red-500",
  "bg-orange-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-yellow-500",
  "bg-indigo-500",
  "bg-teal-500",
];

const AddStageColumn = ({ nextDisplayOrder, onAdded }: AddStageColumnProps) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setEditing(false);
    setName("");
    setColor(COLOR_OPTIONS[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Ustun nomini kiriting");
      return;
    }

    setSaving(true);
    try {
      await api.stages.create({
        name: name.trim(),
        color,
        display_order: nextDisplayOrder,
      });
      toast.success("Ustun qo'shildi");
      reset();
      onAdded();
    } catch (error) {
      console.error("Error creating stage:", error);
      toast.error("Ustun qo'shishda xato");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="h-full w-[300px] shrink-0">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-muted-foreground/30 text-sm text-muted-foreground transition-colors hover:border-muted-foreground/60 hover:bg-muted/40 hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
          Ustun qo'shish
        </button>
      </div>
    );
  }

  return (
    <div className="w-[300px] shrink-0">
      <form
        onSubmit={handleSubmit}
        className="space-y-2.5 rounded-xl border bg-card p-3 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ustun nomi"
            className="h-8"
          />
          <button
            type="button"
            onClick={reset}
            className="ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`h-5 w-5 rounded-full ${c} ${color === c ? "ring-2 ring-offset-2 ring-foreground" : ""}`}
            />
          ))}
        </div>

        <Button type="submit" size="sm" className="w-full" disabled={saving}>
          Qo'shish
        </Button>
      </form>
    </div>
  );
};

export default AddStageColumn;
