export type DeliveryStatus = "ready" | "in_transit" | "delivered" | "needs_followup" | "rejected";

export const DELIVERY_STATUS_ORDER: DeliveryStatus[] = ["ready", "in_transit", "delivered", "needs_followup", "rejected"];

export const DELIVERY_STATUS_META: Record<DeliveryStatus, { label: string; headerClassName: string; badgeClassName: string; dotClassName: string }> = {
  ready: {
    label: "Yetkazishga tayyor",
    headerClassName: "bg-slate-500",
    badgeClassName: "border-slate-300 bg-slate-50 text-slate-700",
    dotClassName: "bg-slate-500",
  },
  in_transit: {
    label: "Yo'lda",
    headerClassName: "bg-blue-500",
    badgeClassName: "border-blue-300 bg-blue-50 text-blue-700",
    dotClassName: "bg-blue-500",
  },
  delivered: {
    label: "Yetkazildi",
    headerClassName: "bg-emerald-500",
    badgeClassName: "border-emerald-300 bg-emerald-50 text-emerald-700",
    dotClassName: "bg-emerald-500",
  },
  needs_followup: {
    label: "Qayta bog'lanish kerak",
    headerClassName: "bg-amber-500",
    badgeClassName: "border-amber-300 bg-amber-50 text-amber-700",
    dotClassName: "bg-amber-500",
  },
  rejected: {
    label: "Rad etildi",
    headerClassName: "bg-red-500",
    badgeClassName: "border-red-300 bg-red-50 text-red-700",
    dotClassName: "bg-red-500",
  },
};

export const getDeliveryStatusMeta = (status: string) => DELIVERY_STATUS_META[status as DeliveryStatus] ?? DELIVERY_STATUS_META.ready;

// Orders without a deliveries row yet are implicitly "ready" (or "delivered"/
// "rejected" if the coarse orders.status already reflects a terminal outcome
// set outside the Dastavka Kanban, e.g. the legacy Orders page). Shared by the
// Kanban board and any other page (AllOrders) that needs to show the same
// fine-grained delivery status.
export const deriveDeliveryStatus = (orderStatus: string, delivery?: { status: string } | null): DeliveryStatus => {
  if (delivery) return (delivery.status as DeliveryStatus) ?? "ready";
  if (orderStatus === "delivered") return "delivered";
  if (orderStatus === "cancelled") return "rejected";
  return "ready";
};

// Mirrors server/src/routes/deliveries.ts ALLOWED_TRANSITIONS — UI-only guard
// for which columns a card may be dropped into; the server re-validates.
export const ALLOWED_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  ready: ["in_transit", "rejected"],
  in_transit: ["delivered", "needs_followup", "rejected"],
  needs_followup: ["in_transit", "rejected"],
  delivered: [],
  rejected: [],
};

export const REJECTION_REASON_OPTIONS: { value: string; label: string }[] = [
  { value: "customer_rejected", label: "Mijoz buyurtmani rad etdi" },
  { value: "customer_changed_mind", label: "Mijoz fikridan qaytdi" },
  { value: "unreachable", label: "Telefon orqali bog'lanib bo'lmadi" },
  { value: "wrong_address", label: "Manzil noto'g'ri" },
  { value: "time_mismatch", label: "Yetkazish vaqti mos kelmadi" },
  { value: "other", label: "Boshqa sabab" },
];

export const getRejectionReasonLabel = (value?: string | null) => REJECTION_REASON_OPTIONS.find((o) => o.value === value)?.label ?? value ?? "—";

export type PaymentStatus = "paid" | "partial" | "unpaid";

export const getPaymentStatus = (totalAmount: number, advancePayment: number): PaymentStatus => {
  if (advancePayment >= totalAmount && totalAmount > 0) return "paid";
  if (advancePayment > 0) return "partial";
  return "unpaid";
};

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; className: string }> = {
  paid: { label: "To'liq to'langan", className: "border-emerald-300 bg-emerald-50 text-emerald-700" },
  partial: { label: "Qisman to'langan", className: "border-amber-300 bg-amber-50 text-amber-700" },
  unpaid: { label: "To'lanmagan", className: "border-red-300 bg-red-50 text-red-700" },
};
