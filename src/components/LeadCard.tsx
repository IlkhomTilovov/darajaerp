import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Phone, Calendar as CalendarIcon, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { getAvatarColor, getInitials, getLeadSourceStyle, getLeadTypeStyle } from "@/lib/leadDisplay";
import LeadStatusMenu from "@/components/leads/LeadStatusMenu";

interface LeadCardProps {
  lead: any;
  isDragging?: boolean;
  onClick?: () => void;
  stage?: any;
  stages?: any[];
  onStageChange?: (leadId: string, newStageId: string) => void;
  onLeadUpdate?: () => void;
}

const LeadCard = ({ lead, isDragging, onClick, stage, stages, onLeadUpdate }: LeadCardProps) => {
  const isSoldStage = stage?.name === "Sotildi" || stages?.find((s) => s.id === lead.stage)?.name === "Sotildi";
  const sourceStyle = getLeadSourceStyle(lead.source);
  const typeStyle = getLeadTypeStyle(lead.lead_type);
  const sellerName = lead.profiles?.full_name;
  const preview = lead.notes || lead.activity;

  return (
    <Card
      className={`cursor-pointer overflow-hidden border-border/70 transition-shadow hover:shadow-md ${isDragging ? "opacity-50" : ""}`}
      onClick={onClick}
    >
      <CardContent className="space-y-2.5 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 truncate text-sm font-semibold leading-tight">{lead.customer_name}</h3>
          {lead.lead_type && (
            <Badge variant="outline" className={`shrink-0 whitespace-nowrap text-[10px] ${typeStyle.badgeClassName}`}>
              {lead.lead_type}
            </Badge>
          )}
        </div>

        {lead.customer_phone && (
          <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 truncate">{lead.customer_phone}</span>
          </div>
        )}

        {preview && <p className="line-clamp-1 text-xs text-muted-foreground">{preview}</p>}

        <div className="flex items-center justify-between gap-2">
          {lead.source ? (
            <Badge variant="outline" className={`text-[10px] ${sourceStyle.badgeClassName}`}>
              {sourceStyle.label}
            </Badge>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <CalendarIcon className="h-3 w-3" />
            {format(new Date(lead.created_at), "dd.MM.yyyy HH:mm")}
          </div>
        </div>

        <div className="flex items-center justify-between border-t pt-2.5">
          <div className="flex min-w-0 items-center gap-1.5">
            {sellerName && (
              <>
                <Avatar className="h-5 w-5">
                  <AvatarFallback className={`text-[9px] font-semibold ${getAvatarColor(sellerName)}`}>
                    {getInitials(sellerName)}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 truncate text-xs text-muted-foreground">{sellerName}</span>
              </>
            )}
          </div>

          <div className="flex shrink-0 items-center" onClick={(e) => e.stopPropagation()}>
            {lead.customer_phone && (
              <a
                href={`tel:${lead.customer_phone}`}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Phone className="h-3.5 w-3.5" />
              </a>
            )}
            <button
              type="button"
              onClick={() => onClick?.()}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </button>
            <LeadStatusMenu lead={lead} isSoldStage={!!isSoldStage} onUpdate={onLeadUpdate} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeadCard;
