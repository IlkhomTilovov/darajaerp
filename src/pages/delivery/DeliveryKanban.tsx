import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import DashboardStatCard from "@/components/dashboard/DashboardStatCard";
import DeliveryColumn from "@/components/delivery/DeliveryColumn";
import DeliveryDetailDialog from "@/components/delivery/DeliveryDetailDialog";
import DeliveryStatusManagement from "@/components/delivery/DeliveryStatusManagement";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DndContext, DragEndEvent, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { Truck, Package, Navigation, CheckCircle2, PhoneCall, XCircle, Search, SlidersHorizontal, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useUserRoles } from "@/hooks/useUserRoles";
import {
  DELIVERY_STATUS_ORDER,
  REJECTION_REASON_OPTIONS,
  deriveDeliveryStatus,
  getAllowedNextStatuses,
  getStatusLabel,
  type CustomDeliveryStatus,
} from "@/lib/deliveryDisplay";

export interface DeliveryBoardItem {
  orderId: string;
  deliveryId: string | null;
  status: string;
  orderNumber: number;
  customerName: string;
  customerPhone: string | null;
  customerPhone2: string | null;
  region: string | null;
  district: string | null;
  orderNotes: string | null;
  totalAmount: number;
  advancePayment: number;
  sellerId: string;
  sellerName: string;
  items: { productName: string; quantity: number; price: number }[];
  courierName: string | null;
  courierPhone: string | null;
  deliveryFee: number | null;
  deliveryDate: string | null;
  deliveredAt: string | null;
  rejectionReason: string | null;
  rejectionNote: string | null;
  followupReason: string | null;
  followupNote: string | null;
  followupDate: string | null;
  notes: string | null;
  orderCreatedAt: string;
  orderDate: string;
}

const DeliveryKanban = () => {
  const { isAdminOrRop } = useUserRoles();
  const [orders, setOrders] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [customStatuses, setCustomStatuses] = useState<CustomDeliveryStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const [sellerFilter, setSellerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [courierFilter, setCourierFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDateFilter, setStartDateFilter] = useState<Date | undefined>(undefined);
  const [endDateFilter, setEndDateFilter] = useState<Date | undefined>(undefined);

  const [selectedItem, setSelectedItem] = useState<DeliveryBoardItem | null>(null);
  const [pendingReject, setPendingReject] = useState<DeliveryBoardItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectNote, setRejectNote] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [ordersData, deliveriesData, sellersData, customStatusesData] = await Promise.all([
        api.orders.list(),
        api.deliveries.list(),
        api.profiles.list(),
        api.deliveryStatuses.list(),
      ]);
      setOrders(ordersData);
      setDeliveries(deliveriesData);
      setSellers(sellersData);
      setCustomStatuses(customStatusesData.sort((a: any, b: any) => a.display_order - b.display_order));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Yuklashda xato");
    } finally {
      setLoading(false);
    }
  };

  const sellerById = useMemo(() => new Map(sellers.map((s) => [s.id, s])), [sellers]);
  const usersById = useMemo(() => new Map(sellers.map((s) => [s.id, { full_name: s.full_name }])), [sellers]);
  const deliveryByOrderId = useMemo(() => new Map(deliveries.map((d) => [d.order_id, d])), [deliveries]);

  const boardItems: DeliveryBoardItem[] = useMemo(() => {
    return orders
      .filter((o) => o.status !== "cancelled")
      .map((order) => {
        const delivery = deliveryByOrderId.get(order.id);
        const status = deriveDeliveryStatus(order.status, delivery);
        return {
          orderId: order.id,
          deliveryId: delivery?.id ?? null,
          status,
          orderNumber: order.order_number,
          customerName: order.customer_name,
          customerPhone: order.customer_phone,
          customerPhone2: order.customer_phone2,
          region: order.region,
          district: order.district,
          orderNotes: order.notes,
          totalAmount: Number(order.total_amount) || 0,
          advancePayment: Number(order.advance_payment) || 0,
          sellerId: order.seller_id,
          sellerName: sellerById.get(order.seller_id)?.full_name ?? "Noma'lum",
          items: (order.order_items ?? []).map((i: any) => ({ productName: i.product_name, quantity: i.quantity, price: Number(i.price) })),
          courierName: delivery?.courier_name ?? null,
          courierPhone: delivery?.courier_phone ?? null,
          deliveryFee: delivery?.delivery_fee !== undefined && delivery?.delivery_fee !== null ? Number(delivery.delivery_fee) : null,
          deliveryDate: delivery?.delivery_date ?? null,
          deliveredAt: delivery?.delivered_at ?? null,
          rejectionReason: delivery?.rejection_reason ?? null,
          rejectionNote: delivery?.rejection_note ?? null,
          followupReason: delivery?.followup_reason ?? null,
          followupNote: delivery?.followup_note ?? null,
          followupDate: delivery?.followup_date ?? null,
          notes: delivery?.notes ?? null,
          orderCreatedAt: order.created_at,
          orderDate: order.order_date,
        };
      });
  }, [orders, deliveryByOrderId, sellerById]);

  const courierOptions = useMemo(() => Array.from(new Set(boardItems.map((i) => i.courierName).filter(Boolean))) as string[], [boardItems]);

  // Stats reflect only the seller + date-range scope (per spec), independent
  // of the status/courier/search filters that narrow the Kanban board itself.
  const statsItems = useMemo(() => {
    return boardItems.filter((item) => {
      if (sellerFilter !== "all" && item.sellerId !== sellerFilter) return false;
      if (startDateFilter && new Date(item.orderDate) < startDateFilter) return false;
      if (endDateFilter) {
        const end = new Date(endDateFilter);
        end.setHours(23, 59, 59, 999);
        if (new Date(item.orderDate) > end) return false;
      }
      return true;
    });
  }, [boardItems, sellerFilter, startDateFilter, endDateFilter]);

  const kanbanItems = useMemo(() => {
    return statsItems.filter((item) => {
      if (courierFilter !== "all" && (courierFilter === "unassigned" ? !!item.courierName : item.courierName !== courierFilter)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!String(item.orderNumber).includes(q) && !item.customerName?.toLowerCase().includes(q) && !item.customerPhone?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [statsItems, courierFilter, searchQuery]);

  // Built-in statuses first, then admin-added custom columns appended after them.
  const allColumnIds = useMemo(() => [...DELIVERY_STATUS_ORDER, ...customStatuses.map((s) => s.id)], [customStatuses]);
  const visibleStatuses = statusFilter === "all" ? allColumnIds : [statusFilter];
  const groupedByStatus = useMemo(() => {
    const map = new Map<string, DeliveryBoardItem[]>();
    for (const status of allColumnIds) map.set(status, kanbanItems.filter((i) => i.status === status));
    return map;
  }, [kanbanItems, allColumnIds]);

  const stats = {
    total: statsItems.length,
    delivered: statsItems.filter((i) => i.status === "delivered").length,
    inTransit: statsItems.filter((i) => i.status === "in_transit").length,
    needsFollowup: statsItems.filter((i) => i.status === "needs_followup").length,
    rejected: statsItems.filter((i) => i.status === "rejected").length,
  };

  const commitStatusChange = async (item: DeliveryBoardItem, payload: Record<string, unknown>) => {
    try {
      await api.deliveries.updateByOrder(item.orderId, payload);
      toast.success("Holat yangilandi");
      fetchAll();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Holatni yangilashda xato");
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeItem = boardItems.find((i) => i.orderId === active.id);
    if (!activeItem) return;

    const overId = over.id as string;
    const targetStatus: string = allColumnIds.includes(overId)
      ? overId
      : boardItems.find((i) => i.orderId === overId)?.status ?? activeItem.status;

    if (targetStatus === activeItem.status) return;

    const allowed = getAllowedNextStatuses(activeItem.status, customStatuses);
    if (!allowed.includes(targetStatus)) {
      toast.error("Bu holatga o'tish mumkin emas");
      return;
    }

    if (targetStatus === "rejected") {
      setPendingReject(activeItem);
      setRejectReason("");
      setRejectNote("");
      return;
    }

    commitStatusChange(activeItem, { status: targetStatus });
  };

  const confirmReject = async () => {
    if (!pendingReject) return;
    if (!rejectReason) {
      toast.error("Rad etish sababini tanlang");
      return;
    }
    if (rejectReason === "other" && !rejectNote.trim()) {
      toast.error("\"Boshqa sabab\" uchun izoh kiritilishi shart");
      return;
    }
    await commitStatusChange(pendingReject, { status: "rejected", rejection_reason: rejectReason, rejection_note: rejectNote || null });
    setPendingReject(null);
  };

  const hasCustomDateFilter = !!startDateFilter || !!endDateFilter;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center text-muted-foreground">Yuklanmoqda...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Truck className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Dastavka</h1>
            <p className="text-muted-foreground">Buyurtmalarni yetkazish jarayonini kuzatish</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <DashboardStatCard id="dlv-total" title="Jami buyurtmalar" value={String(stats.total)} description="Tanlangan filtr bo'yicha" icon={Package} iconClassName="bg-slate-500/10 text-slate-600" sparkline={[]} sparklineColor="#64748b" />
          <DashboardStatCard id="dlv-transit" title="Yo'ldagi buyurtmalar" value={String(stats.inTransit)} description="Hozirda yo'lda" icon={Navigation} iconClassName="bg-blue-500/10 text-blue-600" sparkline={[]} sparklineColor="#3b82f6" />
          <DashboardStatCard id="dlv-delivered" title="Yetkazilgan" value={String(stats.delivered)} description="Muvaffaqiyatli topshirilgan" icon={CheckCircle2} iconClassName="bg-emerald-500/10 text-emerald-600" sparkline={[]} sparklineColor="#22c55e" />
          <DashboardStatCard id="dlv-followup" title="Qayta bog'lanish kerak" value={String(stats.needsFollowup)} description="Qayta urinish kerak" icon={PhoneCall} iconClassName="bg-amber-500/10 text-amber-600" sparkline={[]} sparklineColor="#f59e0b" />
          <DashboardStatCard id="dlv-rejected" title="Rad etilgan" value={String(stats.rejected)} description="Mijoz rad etgan" icon={XCircle} iconClassName="bg-red-500/10 text-red-600" sparkline={[]} sparklineColor="#ef4444" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buyurtma, mijoz yoki telefon..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>

          {isAdminOrRop && (
            <Select value={sellerFilter} onValueChange={setSellerFilter}>
              <SelectTrigger className="h-9 w-[170px]">
                <SelectValue placeholder="Barcha sotuvchilar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha sotuvchilar</SelectItem>
                {sellers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="Barcha holatlar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barcha holatlar</SelectItem>
              {allColumnIds.map((s) => (
                <SelectItem key={s} value={s}>
                  {getStatusLabel(s, customStatuses)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isAdminOrRop && <DeliveryStatusManagement onUpdate={fetchAll} />}

          <Select value={courierFilter} onValueChange={setCourierFilter}>
            <SelectTrigger className="h-9 w-[170px]">
              <SelectValue placeholder="Barcha kuryerlar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barcha kuryerlar</SelectItem>
              <SelectItem value="unassigned">Biriktirilmagan</SelectItem>
              {courierOptions.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={`h-9 gap-1.5 ${hasCustomDateFilter ? "border-primary text-primary" : ""}`}>
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Sana oralig'i
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto space-y-3 p-4" align="start">
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">Boshlanish sanasi</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-start gap-2 font-normal">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {startDateFilter ? format(startDateFilter, "dd.MM.yyyy") : "Tanlash"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={startDateFilter} onSelect={setStartDateFilter} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">Tugash sanasi</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-start gap-2 font-normal">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {endDateFilter ? format(endDateFilter, "dd.MM.yyyy") : "Tanlash"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={endDateFilter} onSelect={setEndDateFilter} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              {hasCustomDateFilter && (
                <Button variant="ghost" size="sm" className="w-full" onClick={() => { setStartDateFilter(undefined); setEndDateFilter(undefined); }}>
                  Tozalash
                </Button>
              )}
            </PopoverContent>
          </Popover>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {visibleStatuses.map((status) => (
              <DeliveryColumn
                key={status}
                status={status}
                items={groupedByStatus.get(status) ?? []}
                onCardClick={setSelectedItem}
                dragDisabled={!isAdminOrRop}
                customStatuses={customStatuses}
              />
            ))}
          </div>
        </DndContext>
      </div>

      {selectedItem && (
        <DeliveryDetailDialog
          item={boardItems.find((i) => i.orderId === selectedItem.orderId) ?? selectedItem}
          open={!!selectedItem}
          onOpenChange={(open) => !open && setSelectedItem(null)}
          onUpdate={fetchAll}
          canEdit={isAdminOrRop}
          usersById={usersById}
          customStatuses={customStatuses}
        />
      )}

      <Dialog open={!!pendingReject} onOpenChange={(open) => !open && setPendingReject(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Buyurtmani rad etish</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">Rad etish sababi *</Label>
              <Select value={rejectReason} onValueChange={setRejectReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Sababni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {REJECTION_REASON_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">Izoh {rejectReason === "other" ? "*" : ""}</Label>
              <Textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingReject(null)}>
              Bekor qilish
            </Button>
            <Button type="button" variant="destructive" onClick={confirmReject}>
              Rad etish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default DeliveryKanban;
