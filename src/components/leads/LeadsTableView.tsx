import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { getAvatarColor, getInitials, getLeadSourceStyle, getLeadTypeStyle } from "@/lib/leadDisplay";

interface LeadsTableViewProps {
  leads: any[];
  stages: any[];
  onLeadClick: (lead: any) => void;
}

const LeadsTableView = ({ leads, stages, onLeadClick }: LeadsTableViewProps) => {
  const stageById = new Map(stages.map((s) => [s.id, s]));

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mijoz</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Bosqich</TableHead>
                <TableHead>Manba</TableHead>
                <TableHead>Sotuvchi</TableHead>
                <TableHead>Narx</TableHead>
                <TableHead>Sana</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">
                    Lidlar topilmadi
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead) => {
                  const stage = stageById.get(lead.stage);
                  const sourceStyle = getLeadSourceStyle(lead.source);
                  const typeStyle = getLeadTypeStyle(lead.lead_type);
                  const sellerName = lead.profiles?.full_name;

                  return (
                    <TableRow key={lead.id} onClick={() => onLeadClick(lead)} className="cursor-pointer">
                      <TableCell>
                        <div className="font-medium">{lead.customer_name}</div>
                        {lead.lead_type && (
                          <Badge variant="outline" className={`mt-1 text-[10px] ${typeStyle.badgeClassName}`}>
                            {lead.lead_type}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{lead.customer_phone || "—"}</TableCell>
                      <TableCell>
                        {stage ? <Badge className={`border-0 text-white ${stage.color}`}>{stage.name}</Badge> : "—"}
                      </TableCell>
                      <TableCell>
                        {lead.source ? (
                          <Badge variant="outline" className={`text-[10px] ${sourceStyle.badgeClassName}`}>
                            {sourceStyle.label}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {sellerName ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className={`text-[10px] font-semibold ${getAvatarColor(sellerName)}`}>
                                {getInitials(sellerName)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{sellerName}</span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {lead.price ? `${Number(lead.price).toLocaleString()} so'm` : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(lead.created_at), "dd.MM.yyyy")}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeadsTableView;
