import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface ActivityItem {
  id: string;
  icon: LucideIcon;
  iconClassName: string;
  title: string;
  subtitle: string;
  date: Date;
}

const timeAgoUz = (date: Date) => {
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMinutes < 1) return "hozir";
  if (diffMinutes < 60) return `${diffMinutes} daqiqa oldin`;
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `${hours} soat oldin`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} kun oldin`;
  const months = Math.floor(days / 30);
  return `${months} oy oldin`;
};

interface RecentActivityCardProps {
  items: ActivityItem[];
}

const RecentActivityCard = ({ items }: RecentActivityCardProps) => (
  <Card className="flex h-full flex-col">
    <CardHeader className="pb-2">
      <CardTitle className="text-base font-semibold">So'nggi faoliyatlar</CardTitle>
    </CardHeader>
    <CardContent className="flex-1 space-y-4">
      {items.length === 0 && <p className="text-sm text-muted-foreground">Hali faoliyat yo'q</p>}
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.id} className="flex items-start gap-3">
            <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", item.iconClassName)}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.title}</p>
              <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{timeAgoUz(item.date)}</span>
          </div>
        );
      })}
    </CardContent>
  </Card>
);

export default RecentActivityCard;
