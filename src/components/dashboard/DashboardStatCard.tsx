import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

interface DashboardStatCardProps {
  id: string;
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  iconClassName: string;
  trend?: { value: number; isPositive: boolean };
  sparkline: number[];
  sparklineColor: string;
  onClick?: () => void;
}

const DashboardStatCard = ({
  id,
  title,
  value,
  description,
  icon: Icon,
  iconClassName,
  trend,
  sparkline,
  sparklineColor,
  onClick,
}: DashboardStatCardProps) => {
  const data = sparkline.map((v, i) => ({ i, v }));
  const hasSignal = data.some((d) => d.v > 0);
  const gradientId = `dash-spark-${id}`;

  return (
    <Card
      onClick={onClick}
      className={cn("relative overflow-hidden transition-shadow hover:shadow-md", onClick && "cursor-pointer")}
    >
      {hasSignal && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-10 opacity-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={sparklineColor} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={sparklineColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={sparklineColor} strokeWidth={2} fill={`url(#${gradientId})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <CardContent className="relative z-10 pt-6">
        <div className="flex items-start justify-between">
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", iconClassName)}>
            <Icon className="h-5 w-5" />
          </div>
          {trend && (
            <span className={cn("text-xs font-semibold", trend.isPositive ? "text-success" : "text-destructive")}>
              {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
            </span>
          )}
        </div>

        <p className="mt-4 text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
};

export default DashboardStatCard;
