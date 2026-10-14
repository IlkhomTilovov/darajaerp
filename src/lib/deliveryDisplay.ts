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

// One row per Dastavka Kanban column, both built-in and custom — see the
// server/src/db/schema.ts deliveryStatuses table comment for the full
// rationale. built_in_key is the literal pipeline key for a built-in column
// (never renamed) and null for a custom one, whose own `id` is what
// deliveries.status stores instead.
export interface DeliveryColumnRow {
  id: string;
  built_in_key: string | null;
  name: string;
  color: string;
  display_order: number;
  hidden: boolean;
}

// What a column's row is actually matched against in deliveries.status and
// in drag/drop ids — the built-in key when there is one, else the row's own id.
export const getColumnStatusKey = (column: DeliveryColumnRow): string => column.built_in_key ?? column.id;

// Admin-added columns (src/components/delivery/DeliveryStatusManagement.tsx)
// are purely organizational and sit outside the fixed 5-status pipeline, so
// they're always freely reachable from — and can freely move to — any other
// visible column, built-in or custom. The strict ALLOWED_TRANSITIONS rules
// above only ever apply between two built-in statuses.
export const getAllowedNextStatuses = (current: string, columns: DeliveryColumnRow[]): string[] => {
  const visibleKeys = columns.filter((c) => !c.hidden).map(getColumnStatusKey);
  const nonBuiltInKeys = visibleKeys.filter((key) => key !== current && !(DELIVERY_STATUS_ORDER as string[]).includes(key));

  if ((DELIVERY_STATUS_ORDER as string[]).includes(current)) {
    const builtInNext = (ALLOWED_TRANSITIONS[current as DeliveryStatus] ?? []).filter((key) => visibleKeys.includes(key));
    return [...builtInNext, ...nonBuiltInKeys];
  }
  return [...visibleKeys.filter((key) => (DELIVERY_STATUS_ORDER as string[]).includes(key)), ...nonBuiltInKeys];
};

export const getStatusLabel = (status: string, columns: DeliveryColumnRow[]): string =>
  columns.find((c) => getColumnStatusKey(c) === status)?.name ?? DELIVERY_STATUS_META[status as DeliveryStatus]?.label ?? status;

// Written out as full literal strings (not built via template interpolation)
// so Tailwind's content scanner actually picks them up — matches the same
// bg-*-500 palette offered by DeliveryStatusManagement.tsx's COLOR_OPTIONS.
const COLOR_BADGE_CLASSES: Record<string, string> = {
  "bg-blue-500": "border-blue-300 bg-blue-50 text-blue-700",
  "bg-green-500": "border-green-300 bg-green-50 text-green-700",
  "bg-red-500": "border-red-300 bg-red-50 text-red-700",
  "bg-orange-500": "border-orange-300 bg-orange-50 text-orange-700",
  "bg-purple-500": "border-purple-300 bg-purple-50 text-purple-700",
  "bg-pink-500": "border-pink-300 bg-pink-50 text-pink-700",
  "bg-yellow-500": "border-yellow-300 bg-yellow-50 text-yellow-700",
  "bg-indigo-500": "border-indigo-300 bg-indigo-50 text-indigo-700",
  "bg-teal-500": "border-teal-300 bg-teal-50 text-teal-700",
};

export const getStatusMeta = (status: string, columns: DeliveryColumnRow[]) => {
  const column = columns.find((c) => getColumnStatusKey(c) === status);
  if (column) {
    return {
      label: column.name,
      headerClassName: column.color,
      badgeClassName: COLOR_BADGE_CLASSES[column.color] ?? "border-border bg-muted text-foreground",
      dotClassName: column.color,
    };
  }
  // Columns are still loading, or this status predates the columns fetch.
  return DELIVERY_STATUS_META[status as DeliveryStatus] ?? DELIVERY_STATUS_META.ready;
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
