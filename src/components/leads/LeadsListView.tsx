import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Phone, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { getAvatarColor, getInitials, getLeadSourceStyle, getLeadTypeStyle } from "@/lib/leadDisplay";

interface LeadsListViewProps {
  leads: any[];
  stages: any[];
  onLeadClick: (lead: any) => void;
}

const LeadsListView = ({ leads, stages, onLeadClick }: LeadsListViewProps) => {
  const stageById = new Map(stages.map((s) => [s.id, s]));

  if (leads.length === 0) {
    return <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Lidlar topilmadi</div>;
  }

  return (
    <div className="space-y-2">
      {leads.map((lead) => {
        const stage = stageById.get(lead.stage);
        const sourceStyle = getLeadSourceStyle(lead.source);
        const typeStyle = getLeadTypeStyle(lead.lead_type);
        const sellerName = lead.profiles?.full_name;

        return (
          <Card
            key={lead.id}
            onClick={() => onLeadClick(lead)}
            className="cursor-pointer border-border/70 p-3.5 transition-shadow hover:shadow-md"
          >
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-semibold">{lead.customer_name}</h3>
                  {lead.lead_type && (
                    <Badge variant="outline" className={`shrink-0 text-[10px] ${typeStyle.badgeClassName}`}>
                      {lead.lead_type}
                    </Badge>
                  )}
                </div>
                {lead.customer_phone && (
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {lead.customer_phone}
                  </div>
                )}
              </div>

              {stage && (
                <Badge className={`shrink-0 border-0 text-white ${stage.color}`}>{stage.name}</Badge>
              )}

              {lead.source && (
                <Badge variant="outline" className={`shrink-0 text-[10px] ${sourceStyle.badgeClassName}`}>
                  {sourceStyle.label}
                </Badge>
              )}

              {lead.price && (
                <span className="shrink-0 text-sm font-semibold">{Number(lead.price).toLocaleString()} so'm</span>
              )}

              <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarIcon className="h-3 w-3" />
                {format(new Date(lead.created_at), "dd.MM.yyyy")}
              </div>

              {sellerName && (
                <div className="flex shrink-0 items-center gap-1.5">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className={`text-[10px] font-semibold ${getAvatarColor(sellerName)}`}>
                      {getInitials(sellerName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-xs text-muted-foreground sm:inline">{sellerName}</span>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default LeadsListView;
