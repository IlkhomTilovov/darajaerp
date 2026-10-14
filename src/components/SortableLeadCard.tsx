import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import LeadCard from "./LeadCard";

interface SortableLeadCardProps {
  lead: any;
  onClick?: () => void;
  stage?: any;
  stages?: any[];
  onStageChange?: (leadId: string, newStageId: string) => void;
}

const SortableLeadCard = ({ lead, onClick, stage, stages, onStageChange }: SortableLeadCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="w-full"
      data-sortable-lead="true"
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <LeadCard 
        lead={lead} 
        isDragging={isDragging} 
        onClick={onClick} 
        stage={stage}
        stages={stages}
        onStageChange={onStageChange}
      />
    </div>
  );
};

export default SortableLeadCard;
