import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import DeliveryCard from "./DeliveryCard";
import type { DeliveryBoardItem } from "@/pages/delivery/DeliveryKanban";

interface SortableDeliveryCardProps {
  item: DeliveryBoardItem;
  onClick?: () => void;
  disabled?: boolean;
}

const SortableDeliveryCard = ({ item, onClick, disabled }: SortableDeliveryCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.orderId, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <DeliveryCard item={item} isDragging={isDragging} onClick={onClick} />
    </div>
  );
};

export default SortableDeliveryCard;
