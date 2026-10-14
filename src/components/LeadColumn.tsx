import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GripVertical, Plus, X } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { api } from "@/lib/api";
import { toast } from "sonner";
import SortableLeadCard from "./SortableLeadCard";

interface LeadColumnProps {
  stage: string;
  title: string;
  leads: any[];
  color: string;
  onLeadClick?: (lead: any) => void;
  stageData?: any;
  stages?: any[];
  onStageChange?: (leadId: string, newStageId: string) => void;
  onAddLead?: (stageId: string) => void;
  dragHandleProps?: Record<string, any>;
  canManage?: boolean;
  onStageDeleted?: () => void;
}

const LeadColumn = ({ stage, title, leads, color, onLeadClick, stageData, stages, onStageChange, onAddLead, dragHandleProps, canManage, onStageDeleted }: LeadColumnProps) => {
  const { setNodeRef } = useDroppable({ id: stage });
  const isSoldStage = stageData?.name === "Sotildi";
  const potential = leads.reduce((sum, l) => sum + (Number(l.price) || 0), 0);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDeleteStage = async () => {
    try {
      await api.stages.remove(stage);
      toast.success("Bosqich o'chirildi");
      setConfirmDelete(false);
      onStageDeleted?.();
    } catch (error) {
      console.error("Error deleting stage:", error);
      toast.error("Bosqichni o'chirishda xato");
    }
  };

  return (
    <div className="flex h-full w-[300px] shrink-0 flex-col">
      <div {...dragHandleProps} className={`cursor-grab rounded-t-xl p-3.5 active:cursor-grabbing ${color}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <GripVertical className="h-4 w-4 shrink-0 text-white/50" />
            <h2 className="truncate font-semibold text-white">{title}</h2>
            <Badge variant="secondary" className="h-5 min-w-[20px] justify-center rounded-full border-0 bg-white/25 px-1.5 text-xs text-white">
              {leads.length}
            </Badge>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {onAddLead && (
              <button
                type="button"
                onClick={() => onAddLead(stage)}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex h-6 w-6 items-center justify-center rounded-md text-white/85 transition-colors hover:bg-white/20 hover:text-white"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
            {canManage && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex h-6 w-6 items-center justify-center rounded-md text-white/85 transition-colors hover:bg-white/20 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <p className="mt-1 text-xs text-white/80">
          {isSoldStage ? "Umumiy" : "Potensial"}: {potential.toLocaleString()} so'm
        </p>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bosqichni o'chirish</AlertDialogTitle>
            <AlertDialogDescription>
              "{title}" bosqichini o'chirishga ishonchingiz komilmi? Agar bu bosqichda lidlar bo'lsa, ular hech qaysi ustunda ko'rinmay qoladi (ma'lumotlari saqlanib qoladi, lekin topish qiyinlashadi).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStage}>O'chirish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="flex-1 overflow-hidden rounded-t-none border-t-0 bg-muted/30">
        <ScrollArea className="h-[var(--kanban-col-h,calc(100vh_-_320px))]">
          {/* Radix wraps this child in an internal display:table div for horizontal-scroll
              measurement, which sizes to content instead of the viewport unless a child
              pins a fixed width — without it, a non-shrinking badge anywhere inside could
              balloon every card in the column past the 300px column width. mx-auto centers
              it within that table wrapper, since a fixed width alone left it hugging the
              left edge with all the slack piling up on the right. */}
          <div ref={setNodeRef} className="mx-auto w-[294px] space-y-2.5 p-2.5">
            <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
              {leads.map((lead) => (
                <SortableLeadCard
                  key={lead.id}
                  lead={lead}
                  onClick={() => onLeadClick?.(lead)}
                  stage={stageData}
                  stages={stages}
                  onStageChange={onStageChange}
                />
              ))}
            </SortableContext>

            {leads.length === 0 && (
              <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">Lidlar yo'q</div>
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
};

export default LeadColumn;
