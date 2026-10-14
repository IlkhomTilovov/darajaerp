import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { GripVertical, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { api } from "@/lib/api";
import { toast } from "sonner";
import SortableDeliveryCard from "./SortableDeliveryCard";
import { getColumnStatusKey, getStatusMeta, type DeliveryColumnRow } from "@/lib/deliveryDisplay";
import type { DeliveryBoardItem } from "@/pages/delivery/DeliveryKanban";

interface DeliveryColumnProps {
  status: string;
  items: DeliveryBoardItem[];
  onCardClick: (item: DeliveryBoardItem) => void;
  dragDisabled?: boolean;
  columns: DeliveryColumnRow[];
  canManage?: boolean;
  onColumnDeleted?: () => void;
  dragHandleProps?: Record<string, any>;
}

const DeliveryColumn = ({ status, items, onCardClick, dragDisabled, columns, canManage, onColumnDeleted, dragHandleProps }: DeliveryColumnProps) => {
  const { setNodeRef } = useDroppable({ id: status });
  const meta = getStatusMeta(status, columns);
  const ownRow = columns.find((c) => getColumnStatusKey(c) === status);
  const totalAmount = items.reduce((sum, i) => sum + i.totalAmount, 0);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDeleteColumn = async () => {
    if (!ownRow) return;
    try {
      await api.deliveryStatuses.remove(ownRow.id);
      toast.success(ownRow.built_in_key ? "Ustun yashirildi" : "Ustun o'chirildi");
      setConfirmDelete(false);
      onColumnDeleted?.();
    } catch (error) {
      console.error("Error deleting delivery status column:", error);
      toast.error("Ustunni o'chirishda xato");
    }
  };

  return (
    <div className="flex h-full min-w-[300px] flex-col">
      <div
        {...(canManage ? dragHandleProps : {})}
        className={`rounded-t-xl p-3.5 ${meta.headerClassName} ${canManage ? "cursor-grab active:cursor-grabbing" : ""}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {canManage && <GripVertical className="h-4 w-4 shrink-0 text-white/50" />}
            <h2 className="truncate font-semibold text-white">{meta.label}</h2>
            <Badge variant="secondary" className="h-5 min-w-[20px] shrink-0 justify-center rounded-full border-0 bg-white/25 px-1.5 text-xs text-white">
              {items.length}
            </Badge>
          </div>
          {canManage && ownRow && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white/85 transition-colors hover:bg-white/20 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-white/80">Jami: {totalAmount.toLocaleString()} so'm</p>
      </div>

      <Card className="flex-1 overflow-hidden rounded-t-none border-t-0 bg-muted/30">
        <ScrollArea className="h-[calc(100vh-320px)]">
          <div ref={setNodeRef} className="space-y-2.5 p-2.5">
            <SortableContext items={items.map((i) => i.orderId)} strategy={verticalListSortingStrategy}>
              {items.map((item) => (
                <SortableDeliveryCard key={item.orderId} item={item} onClick={() => onCardClick(item)} disabled={dragDisabled} />
              ))}
            </SortableContext>

            {items.length === 0 && <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">Buyurtmalar yo'q</div>}
          </div>
        </ScrollArea>
      </Card>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ownRow?.built_in_key ? "Ustunni yashirish" : "Ustunni o'chirish"}</AlertDialogTitle>
            <AlertDialogDescription>
              {ownRow?.built_in_key
                ? `"${meta.label}" asosiy ustun bo'lgani uchun butunlay o'chirilmaydi, lekin doskadan yashirinadi — xohlasangiz "Ustun qo'shish" oynasidan qayta ko'rsatishingiz mumkin.`
                : `"${meta.label}" ustunini o'chirishga ishonchingiz komilmi? Agar bu ustunda buyurtmalar bo'lsa, ular hech qaysi ustunda ko'rinmay qoladi (ma'lumotlari saqlanib qoladi, lekin topish qiyinlashadi).`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteColumn}>{ownRow?.built_in_key ? "Yashirish" : "O'chirish"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DeliveryColumn;
