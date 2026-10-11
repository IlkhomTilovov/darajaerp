import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface DonutCardProps {
  title: string;
  icon: ReactNode;
  unitLabel: string;
  slices: DonutSlice[];
}

const DonutCard = ({ title, icon, unitLabel, slices }: DonutCardProps) => {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const pieData = total > 0 ? slices : [{ label: "", value: 1, color: "hsl(var(--muted))" }];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          {icon}
          {title}
        </CardTitle>
        <span className="text-xs text-muted-foreground">
          Jami: {total} {unitLabel}
        </span>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="relative h-32 w-32 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" innerRadius={42} outerRadius={60} paddingAngle={total > 0 ? 2 : 0} stroke="none">
                  {pieData.map((s, i) => (
                    <Cell key={i} fill={s.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold">{total}</span>
              <span className="text-[11px] text-muted-foreground">{unitLabel}</span>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            {slices.map((s) => (
              <div key={s.label} className="flex items-center justify-between gap-2 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="truncate text-muted-foreground">{s.label}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-medium">{s.value}</span>
                  <span className="w-9 text-right text-xs text-muted-foreground">
                    {total > 0 ? Math.round((s.value / total) * 100) : 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DonutCard;
