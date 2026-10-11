import { LayoutGrid, List, Table2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type LeadsViewMode = "kanban" | "list" | "table";

interface LeadsViewTabsProps {
  value: LeadsViewMode;
  onChange: (value: LeadsViewMode) => void;
}

const LeadsViewTabs = ({ value, onChange }: LeadsViewTabsProps) => (
  <Tabs value={value} onValueChange={(v) => onChange(v as LeadsViewMode)}>
    <TabsList className="h-9">
      <TabsTrigger value="kanban" className="gap-1.5 px-3 text-sm">
        <LayoutGrid className="h-3.5 w-3.5" />
        Kanban
      </TabsTrigger>
      <TabsTrigger value="list" className="gap-1.5 px-3 text-sm">
        <List className="h-3.5 w-3.5" />
        Ro'yxat
      </TabsTrigger>
      <TabsTrigger value="table" className="gap-1.5 px-3 text-sm">
        <Table2 className="h-3.5 w-3.5" />
        Jadval
      </TabsTrigger>
    </TabsList>
  </Tabs>
);

export default LeadsViewTabs;
