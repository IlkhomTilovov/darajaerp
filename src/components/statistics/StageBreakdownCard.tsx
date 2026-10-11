import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListTree } from "lucide-react";

export interface StageBreakdownRow {
  id: string;
  name: string;
  color: string;
  count: number;
  percent: number;
}

interface StageBreakdownCardProps {
  rows: StageBreakdownRow[];
  onRowClick?: (stageId: string) => void;
}

const StageBreakdownCard = ({ rows, onRowClick }: StageBreakdownCardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="flex items-center gap-2 text-base font-semibold">
        <ListTree className="h-4 w-4 text-muted-foreground" />
        Lid bosqichlari
      </CardTitle>
      <p className="text-sm text-muted-foreground">Lidlarning joriy holati</p>
    </CardHeader>
    <CardContent className="space-y-3">
      {rows.length === 0 && <p className="text-sm text-muted-foreground">Lidlar topilmadi</p>}
      {rows.map((row) => (
        <div
          key={row.id}
          onClick={() => onRowClick?.(row.id)}
          className={`flex items-center gap-3 ${onRowClick ? "cursor-pointer" : ""}`}
        >
          <span className="w-28 shrink-0 truncate text-sm">{row.name}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full ${row.color}`} style={{ width: `${row.percent}%` }} />
          </div>
          <span className="w-8 shrink-0 text-right text-sm font-medium">{row.count}</span>
          <span className="w-10 shrink-0 text-right text-xs text-muted-foreground">{row.percent}%</span>
        </div>
      ))}
    </CardContent>
  </Card>
);

export default StageBreakdownCard;
