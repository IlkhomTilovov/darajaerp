import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface DashboardHeaderProps {
  overdueTasksCount: number;
  displayName: string;
  roleLabel: string;
  initials: string;
  onSignOut: () => void;
  extra?: ReactNode;
}

const DashboardHeader = ({ overdueTasksCount, displayName, roleLabel, initials, onSignOut, extra }: DashboardHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b bg-card px-4 sm:px-6">
      <SidebarTrigger className="md:hidden" />

      <div className="relative hidden max-w-md flex-1 sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Mijoz, zakaz yoki mahsulot qidirish..." className="pl-9 pr-16" />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
          Ctrl K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {extra}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Bell className="h-4 w-4" />
              {overdueTasksCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -right-1.5 -top-1.5 h-5 min-w-[20px] justify-center rounded-full px-1 text-[10px]"
                >
                  {overdueTasksCount}
                </Badge>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Bildirishnomalar</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {overdueTasksCount > 0 ? (
              <DropdownMenuItem onClick={() => navigate("/tasks")}>
                {overdueTasksCount} ta muddati o'tgan vazifa bor
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem disabled>Yangi bildirishnoma yo'q</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="flex items-center gap-1 rounded-full">
              <Avatar className="h-9 w-9 border">
                <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <p className="truncate text-sm font-semibold">{displayName}</p>
              <p className="truncate text-xs font-normal text-muted-foreground">{roleLabel}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/profile")}>Profil</DropdownMenuItem>
            <DropdownMenuItem onClick={onSignOut} className="text-destructive focus:text-destructive">
              Chiqish
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default DashboardHeader;
