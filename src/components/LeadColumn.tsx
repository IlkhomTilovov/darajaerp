import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GripVertical, Plus } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
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
}

const LeadColumn = ({ stage, title, leads, color, onLeadClick, stageData, stages, onStageChange, onAddLead, dragHandleProps }: LeadColumnProps) => {
  const { setNodeRef } = useDroppable({ id: stage });
  const isSoldStage = stageData?.name === "Sotildi";
  const potential = leads.reduce((sum, l) => sum + (Number(l.price) || 0), 0);

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
          {onAddLead && (
            <button
              type="button"
              onClick={() => onAddLead(stage)}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white/85 transition-colors hover:bg-white/20 hover:text-white"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-white/80">
          {isSoldStage ? "Umumiy" : "Potensial"}: {potential.toLocaleString()} so'm
        </p>
      </div>

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
