import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  REJECTION_REASON_OPTIONS,
  getAllowedNextStatuses,
  getPaymentStatus,
  getStatusLabel,
  getStatusMeta,
  PAYMENT_STATUS_META,
  type DeliveryColumnRow,
} from "@/lib/deliveryDisplay";
import type { DeliveryBoardItem } from "@/pages/delivery/DeliveryKanban";

interface DeliveryDetailDialogProps {
  item: DeliveryBoardItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  canEdit: boolean;
  usersById: Map<string, { full_name: string }>;
  columns: DeliveryColumnRow[];
}

const describeHistoryEntry = (entry: any, columns: DeliveryColumnRow[]): string => {
  const meta = entry.metadata || {};
  if (entry.action === "created") return "Yetkazma yaratildi";
  if (entry.action === "status_changed") {
    const from = getStatusLabel(meta.from, columns);
    const to = getStatusLabel(meta.to, columns);
    let text = `Holat: ${from} → ${to}`;
    if (meta.reason) text += ` (${REJECTION_REASON_OPTIONS.find((r) => r.value === meta.reason)?.label ?? meta.reason})`;
    if (meta.note) text += ` — ${meta.note}`;
    return text;
  }
  return "Ma'lumotlar yangilandi";
};

const DeliveryDetailDialog = ({ item, open, onOpenChange, onUpdate, canEdit, usersById, columns }: DeliveryDetailDialogProps) => {
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [form, setForm] = useState({
    status: item.status,
    courierName: item.courierName ?? "",
    courierPhone: item.courierPhone ?? "",
    deliveryFee: item.deliveryFee !== null ? String(item.deliveryFee) : "",
    deliveryDate: item.deliveryDate ?? "",
    rejectionReason: item.rejectionReason ?? "",
    rejectionNote: item.rejectionNote ?? "",
    followupReason: item.followupReason ?? "",
    followupNote: item.followupNote ?? "",
    followupDate: item.followupDate ?? "",
    notes: item.notes ?? "",
  });

  useEffect(() => {
    setForm({
      status: item.status,
      courierName: item.courierName ?? "",
      courierPhone: item.courierPhone ?? "",
      deliveryFee: item.deliveryFee !== null ? String(item.deliveryFee) : "",
      deliveryDate: item.deliveryDate ?? "",
      rejectionReason: item.rejectionReason ?? "",
      rejectionNote: item.rejectionNote ?? "",
      followupReason: item.followupReason ?? "",
      followupNote: item.followupNote ?? "",
      followupDate: item.followupDate ?? "",
      notes: item.notes ?? "",
    });
    if (item.deliveryId) {
      api.deliveries.history(item.deliveryId).then(setHistory).catch(() => setHistory([]));
    } else {
      setHistory([]);
    }
  }, [item.orderId, item.deliveryId]);

  useEffect(() => {
    if (open) api.couriers.list().then(setCouriers).catch(() => setCouriers([]));
  }, [open]);

  const handleSelectCourier = (courierId: string) => {
    const courier = couriers.find((c) => c.id === courierId);
    if (!courier) return;
    setForm((prev) => ({ ...prev, courierName: courier.name, courierPhone: courier.phone || "" }));
  };

  const statusMeta = getStatusMeta(item.status, columns);
  const allowedNext = getAllowedNextStatuses(item.status, columns);
  const payment = getPaymentStatus(item.totalAmount, item.advancePayment);
  const paymentMeta = PAYMENT_STATUS_META[payment];

  const handleSave = async () => {
    if (form.status === "rejected" && !form.rejectionReason) {
      toast.error("Rad etish sababini tanlang");
      return;
    }
    if (form.status === "rejected" && form.rejectionReason === "other" && !form.rejectionNote.trim()) {
      toast.error("\"Boshqa sabab\" uchun izoh kiritilishi shart");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        courier_name: form.courierName || null,
        courier_phone: form.courierPhone || null,
        delivery_fee: form.deliveryFee === "" ? null : Number(form.deliveryFee),
        delivery_date: form.deliveryDate || null,
        notes: form.notes || null,
      };
      if (form.status !== item.status) payload.status = form.status;
      if (form.status === "rejected") {
        payload.rejection_reason = form.rejectionReason;
        payload.rejection_note = form.rejectionNote || null;
      }
      if (form.status === "needs_followup") {
        payload.followup_reason = form.followupReason || null;
        payload.followup_note = form.followupNote || null;
        payload.followup_date = form.followupDate || null;
      }

      await api.deliveries.updateByOrder(item.orderId, payload);
      toast.success("Yetkazma yangilandi");
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Saqlashda xato");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Buyurtma #{item.orderNumber}
            <Badge variant="outline" className={statusMeta.badgeClassName}>
              {statusMeta.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="font-medium">{item.customerName}</p>
            <p className="text-muted-foreground">{item.customerPhone}{item.customerPhone2 ? `, ${item.customerPhone2}` : ""}</p>
            <p className="text-muted-foreground">{item.region}, {item.district}</p>
            {item.orderNotes && <p className="mt-1 text-muted-foreground">Izoh: {item.orderNotes}</p>}
          </div>

          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Kitoblar</Label>
            <div className="space-y-1 rounded-lg border p-3 text-sm">
              {item.items.map((i, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{i.productName} x{i.quantity}</span>
                  <span className="text-muted-foreground">{(i.price * i.quantity).toLocaleString()} so'm</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">Sotuvchi</Label>
              <p>{item.sellerName}</p>
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">To'lov holati</Label>
              <Badge variant="outline" className={paymentMeta.className}>{paymentMeta.label}</Badge>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.advancePayment.toLocaleString()} / {item.totalAmount.toLocaleString()} so'm
              </p>
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Holat</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })} disabled={!canEdit}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={item.status}>{statusMeta.label} (joriy)</SelectItem>
                {allowedNext.map((s) => (
                  <SelectItem key={s} value={s}>
                    {getStatusLabel(s, columns)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {couriers.length > 0 && (
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">Ro'yxatdan kuryer tanlash</Label>
              <Select onValueChange={handleSelectCourier} disabled={!canEdit}>
                <SelectTrigger>
                  <SelectValue placeholder="Kuryerni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {couriers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {c.phone ? ` — ${c.phone}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">Kuryer ismi</Label>
              <Input value={form.courierName} onChange={(e) => setForm({ ...form, courierName: e.target.value })} placeholder="Kuryer ismi" disabled={!canEdit} />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">Kuryer telefoni</Label>
              <Input value={form.courierPhone} onChange={(e) => setForm({ ...form, courierPhone: e.target.value })} placeholder="+998 XX XXX XX XX" disabled={!canEdit} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">Dastavka narxi</Label>
              <Input type="number" value={form.deliveryFee} onChange={(e) => setForm({ ...form, deliveryFee: e.target.value })} disabled={!canEdit} />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">Yetkazish sanasi</Label>
              <Input type="date" value={form.deliveryDate} onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })} disabled={!canEdit} />
            </div>
          </div>

          {form.status === "rejected" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">Rad etish sababi *</Label>
                <Select value={form.rejectionReason} onValueChange={(v) => setForm({ ...form, rejectionReason: v })} disabled={!canEdit}>
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
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  Izoh {form.rejectionReason === "other" ? "*" : ""}
                </Label>
                <Input value={form.rejectionNote} onChange={(e) => setForm({ ...form, rejectionNote: e.target.value })} disabled={!canEdit} />
              </div>
            </div>
          )}

          {form.status === "needs_followup" && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">Sabab</Label>
                <Input value={form.followupReason} onChange={(e) => setForm({ ...form, followupReason: e.target.value })} disabled={!canEdit} />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">Izoh</Label>
                <Input value={form.followupNote} onChange={(e) => setForm({ ...form, followupNote: e.target.value })} disabled={!canEdit} />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">Qayta bog'lanish sanasi</Label>
                <Input type="date" value={form.followupDate} onChange={(e) => setForm({ ...form, followupDate: e.target.value })} disabled={!canEdit} />
              </div>
            </div>
          )}

          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Izoh</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} disabled={!canEdit} />
          </div>

          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Status o'zgarishlari tarixi</Label>
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border p-3">
              {history.length === 0 && <p className="text-sm text-muted-foreground">Tarix yo'q</p>}
              {history.map((entry) => (
                <div key={entry.id} className="flex items-start justify-between gap-2 text-xs">
                  <div>
                    <p>{describeHistoryEntry(entry, columns)}</p>
                    <p className="text-muted-foreground">{usersById.get(entry.actor_id)?.full_name ?? "Noma'lum"}</p>
                  </div>
                  <span className="shrink-0 text-muted-foreground">{format(new Date(entry.created_at), "dd.MM.yyyy HH:mm")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Yopish
          </Button>
          {canEdit && (
            <Button type="button" onClick={handleSave} disabled={saving}>
              Saqlash
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryDetailDialog;
