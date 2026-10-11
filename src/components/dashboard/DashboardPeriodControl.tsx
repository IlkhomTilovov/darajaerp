import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { Calendar as CalendarIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

export type DashboardPeriod = "today" | "week" | "month" | "year" | "custom";

export const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  today: "Bugun",
  week: "1 hafta",
  month: "1 oy",
  year: "1 yil",
  custom: "Tanlangan",
};

interface DashboardPeriodControlProps {
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
  dateRangeLabel: string;
  customRange: DateRange | undefined;
  onCustomRangeChange: (range: DateRange | undefined) => void;
}

const QUICK_PERIODS: DashboardPeriod[] = ["today", "week", "month", "year"];

const DashboardPeriodControl = ({
  period,
  onPeriodChange,
  dateRangeLabel,
  customRange,
  onCustomRangeChange,
}: DashboardPeriodControlProps) => {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleRangeSelect = (range: DateRange | undefined) => {
    onCustomRangeChange(range);
    if (range?.from && range?.to) {
      onPeriodChange("custom");
      setCalendarOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="hidden items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary lg:flex"
          >
            <CalendarIcon className="h-4 w-4" />
            <span>{dateRangeLabel}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            numberOfMonths={2}
            selected={customRange}
            onSelect={handleRangeSelect}
            defaultMonth={customRange?.from}
          />
        </PopoverContent>
      </Popover>

      <Tabs value={period} onValueChange={(v) => onPeriodChange(v as DashboardPeriod)}>
        <TabsList className="h-9">
          {QUICK_PERIODS.map((key) => (
            <TabsTrigger key={key} value={key} className="px-2.5 text-xs sm:px-3 sm:text-sm">
              {PERIOD_LABELS[key]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
};

export default DashboardPeriodControl;
