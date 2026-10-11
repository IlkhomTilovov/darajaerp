import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api } from "@/lib/api";
import { toast } from "sonner";

const ACTION_STATUS_OPTIONS = [
  "O'ylab ko'radi",
  "Mavjud emas",
  "Qimmatlik qildi",
  "Telegramdan ma'lumot",
  "Hozir gaplashaolmaydi",
  "Keyinroq oladi",
  "O'chiq",
  "Umid bor",
];

const DELIVERY_STATUS_OPTIONS = [
  { value: "Jarayonda", label: "Jarayonda", color: "bg-yellow-500" },
  { value: "Tasdiqlandi", label: "Tasdiqlandi", color: "bg-green-500" },
  { value: "Bekor bo'ldi", label: "Bekor bo'ldi", color: "bg-red-500" },
];

interface LeadStatusMenuProps {
  lead: any;
  isSoldStage: boolean;
  onUpdate?: () => void;
}

const LeadStatusMenu = ({ lead, isSoldStage, onUpdate }: LeadStatusMenuProps) => {
  const handleActionStatusChange = async (newActionStatus: string) => {
    try {
      await api.leads.update(lead.id, { action_status: newActionStatus });
      toast.success("Amal yangilandi!");
      onUpdate?.();
    } catch (error) {
      console.error("Error updating action status:", error);
      toast.error("Amalni yangilashda xato");
    }
  };

  const handleDeliveryStatusChange = async (newDeliveryStatus: string) => {
    try {
      await api.leads.update(lead.id, { delivery_status: newDeliveryStatus });
      toast.success("Yetkazish holati yangilandi!");
      onUpdate?.();
    } catch (error) {
      console.error("Error updating delivery status:", error);
      toast.error("Yetkazish holatini yangilashda xato");
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-3" align="end" onClick={(e) => e.stopPropagation()}>
        <div>
          <Label className="mb-1 block text-xs font-medium text-muted-foreground">Amallar</Label>
          <Select value={lead.action_status || ""} onValueChange={handleActionStatusChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Amalni tanlang" />
            </SelectTrigger>
            <SelectContent>
              {ACTION_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isSoldStage && (
          <div>
            <Label className="mb-1 block text-xs font-medium text-muted-foreground">Yetkazish holati</Label>
            <Select value={lead.delivery_status || ""} onValueChange={handleDeliveryStatusChange}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Holatni tanlang" />
              </SelectTrigger>
              <SelectContent>
                {DELIVERY_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${option.color}`} />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default LeadStatusMenu;
