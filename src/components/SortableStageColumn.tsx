import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DndContext, DragEndEvent, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import LeadColumn from "./LeadColumn";

interface SortableStageColumnProps {
  stage: any;
  leads: any[];
  onLeadClick: (lead: any) => void;
  stages: any[];
  onStageChange: (leadId: string, newStageId: string) => void;
  onDragStart: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onAddLead?: (stageId: string) => void;
}

const SortableStageColumn = ({
  stage,
  leads,
  onLeadClick,
  stages,
  onStageChange,
  onDragStart,
  onDragEnd,
  onAddLead,
}: SortableStageColumnProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  return (
    <div ref={setNodeRef} style={style}>
      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <LeadColumn
          stage={stage.id}
          title={stage.name}
          leads={leads.filter((lead) => lead.stage === stage.id)}
          color={stage.color}
          onLeadClick={onLeadClick}
          stageData={stage}
          stages={stages}
          onStageChange={onStageChange}
          onAddLead={onAddLead}
          dragHandleProps={{ ...attributes, ...listeners }}
        />
      </DndContext>
    </div>
  );
};

export default SortableStageColumn;