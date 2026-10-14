import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import SortableDeliveryCard from "./SortableDeliveryCard";
import { getStatusMeta, type CustomDeliveryStatus } from "@/lib/deliveryDisplay";
import type { DeliveryBoardItem } from "@/pages/delivery/DeliveryKanban";

interface DeliveryColumnProps {
  status: string;
  items: DeliveryBoardItem[];
  onCardClick: (item: DeliveryBoardItem) => void;
  dragDisabled?: boolean;
  customStatuses: CustomDeliveryStatus[];
}

const DeliveryColumn = ({ status, items, onCardClick, dragDisabled, customStatuses }: DeliveryColumnProps) => {
  const { setNodeRef } = useDroppable({ id: status });
  const meta = getStatusMeta(status, customStatuses);
  const totalAmount = items.reduce((sum, i) => sum + i.totalAmount, 0);

  return (
    <div className="flex h-full min-w-[300px] flex-col">
      <div className={`rounded-t-xl p-3.5 ${meta.headerClassName}`}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="truncate font-semibold text-white">{meta.label}</h2>
          <Badge variant="secondary" className="h-5 min-w-[20px] justify-center rounded-full border-0 bg-white/25 px-1.5 text-xs text-white">
            {items.length}
          </Badge>
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
    </div>
  );
};

export default DeliveryColumn;
