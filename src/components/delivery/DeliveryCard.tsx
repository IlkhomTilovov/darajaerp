import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Phone, Calendar as CalendarIcon, Package, Truck } from "lucide-react";
import { format } from "date-fns";
import { getAvatarColor, getInitials } from "@/lib/leadDisplay";
import { getPaymentStatus, PAYMENT_STATUS_META } from "@/lib/deliveryDisplay";
import type { DeliveryBoardItem } from "@/pages/delivery/DeliveryKanban";

interface DeliveryCardProps {
  item: DeliveryBoardItem;
  isDragging?: boolean;
  onClick?: () => void;
}

const DeliveryCard = ({ item, isDragging, onClick }: DeliveryCardProps) => {
  const payment = getPaymentStatus(item.totalAmount, item.advancePayment);
  const paymentMeta = PAYMENT_STATUS_META[payment];
  const itemsLabel = item.items.length
    ? item.items.map((i) => `${i.productName} x${i.quantity}`).join(", ")
    : null;

  return (
    <Card
      className={`cursor-pointer border-border/70 transition-shadow hover:shadow-md ${isDragging ? "opacity-50" : ""}`}
      onClick={onClick}
    >
      <CardContent className="space-y-2.5 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-sm font-semibold leading-tight">#{item.orderNumber} — {item.customerName}</h3>
          <Badge variant="outline" className={`shrink-0 whitespace-nowrap text-[10px] ${paymentMeta.className}`}>
            {paymentMeta.label}
          </Badge>
        </div>

        {item.customerPhone && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{item.customerPhone}</span>
          </div>
        )}

        {itemsLabel && (
          <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Package className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-1">{itemsLabel}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold">{item.totalAmount.toLocaleString()} so'm</span>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <CalendarIcon className="h-3 w-3" />
            {format(new Date(item.orderCreatedAt), "dd.MM.yyyy")}
          </div>
        </div>

        {item.courierName && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Truck className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {item.courierName}
              {item.courierPhone ? ` — ${item.courierPhone}` : ""}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between border-t pt-2.5">
          <div className="flex min-w-0 items-center gap-1.5">
            {item.sellerName && (
              <>
                <Avatar className="h-5 w-5">
                  <AvatarFallback className={`text-[9px] font-semibold ${getAvatarColor(item.sellerName)}`}>{getInitials(item.sellerName)}</AvatarFallback>
                </Avatar>
                <span className="truncate text-xs text-muted-foreground">{item.sellerName}</span>
              </>
            )}
          </div>
          {item.deliveryDate && (
            <span className="shrink-0 text-[11px] text-muted-foreground">Yetkazish: {format(new Date(item.deliveryDate), "dd.MM")}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DeliveryCard;
