import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import DeliveryColumn from "./DeliveryColumn";
import type { DeliveryColumnRow } from "@/lib/deliveryDisplay";
import type { DeliveryBoardItem } from "@/pages/delivery/DeliveryKanban";

interface SortableDeliveryColumnProps {
  status: string;
  items: DeliveryBoardItem[];
  onCardClick: (item: DeliveryBoardItem) => void;
  dragDisabled?: boolean;
  columns: DeliveryColumnRow[];
  canManage: boolean;
  onColumnDeleted: () => void;
}

const SortableDeliveryColumn = ({ status, items, onCardClick, dragDisabled, columns, canManage, onColumnDeleted }: SortableDeliveryColumnProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: status, disabled: !canManage });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <DeliveryColumn
        status={status}
        items={items}
        onCardClick={onCardClick}
        dragDisabled={dragDisabled}
        columns={columns}
        canManage={canManage}
        onColumnDeleted={onColumnDeleted}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
};

export default SortableDeliveryColumn;
