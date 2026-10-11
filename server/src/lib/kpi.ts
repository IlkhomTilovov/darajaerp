// Shared KPI calculation helpers, used by routes/employees.ts and (incrementally)
// by routes/statistics-style aggregations. Centralizes the "cancelled orders
// don't count as revenue" rule that previously only lived in salesReport.ts.
//
// Every calculator returns `null` when there isn't enough data to produce a
// meaningful number, instead of a misleading 0 — callers / the frontend should
// render "Ma'lumot mavjud emas" for a null result.

export interface OrderRow {
  id: string;
  sellerId: string;
  status: string;
  totalAmount: string | number;
}

export interface LeadRow {
  id: string;
  sellerId: string;
  stage: string | null;
}

export interface TaskRow {
  id: string;
  sellerId: string;
  status: string;
  dueDate: string | Date;
}

const toNumber = (value: string | number) => (typeof value === "number" ? value : parseFloat(value) || 0);

export const calcRevenue = (orders: OrderRow[]): number =>
  orders.filter((o) => o.status !== "cancelled").reduce((sum, o) => sum + toNumber(o.totalAmount), 0);

export const calcAverageCheck = (orders: OrderRow[]): number | null => {
  const counted = orders.filter((o) => o.status !== "cancelled");
  if (counted.length === 0) return null;
  return calcRevenue(orders) / counted.length;
};

// Conversion = unique leads that reached the "sold" stage / all leads in the
// period. Each lead counts at most once (dedup by id), so a lead that moved
// through several stages is never double-counted.
export const calcConversionRate = (leads: LeadRow[], soldStageId: string | null | undefined): number | null => {
  if (leads.length === 0 || !soldStageId) return null;
  const uniqueLeadIds = new Set(leads.map((l) => l.id));
  const wonLeadIds = new Set(leads.filter((l) => l.stage === soldStageId).map((l) => l.id));
  return (wonLeadIds.size / uniqueLeadIds.size) * 100;
};

export interface TaskCompletionSummary {
  total: number;
  completed: number;
  overdue: number;
  rate: number | null;
}

export const calcTaskCompletion = (tasks: TaskRow[], now: Date = new Date()): TaskCompletionSummary => {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const overdue = tasks.filter((t) => t.status !== "completed" && new Date(t.dueDate) < now).length;
  return { total, completed, overdue, rate: total === 0 ? null : (completed / total) * 100 };
};

export interface KpiTargetRow {
  role: string;
  userId: string | null;
  metricKey: string;
  [key: string]: unknown;
}

// Resolves the effective KPI targets for one employee: a role-wide target
// (userId === null) applies to everyone with that role, but a target set for
// that specific employee overrides the role-wide one for the same metric.
export const resolveEmployeeTargets = <T extends KpiTargetRow>(allTargets: T[], role: string, employeeId: string): T[] => {
  const candidates = allTargets.filter((t) => t.role === role && (t.userId === null || t.userId === employeeId));
  const byMetric = new Map<string, T>();
  for (const t of candidates) {
    const existing = byMetric.get(t.metricKey);
    if (!existing || (t.userId === employeeId && existing.userId === null)) {
      byMetric.set(t.metricKey, t);
    }
  }
  return [...byMetric.values()];
};

// How close an actual value is to its configured target, as a percentage.
// Returns null when there's no target to measure against or no actual data.
export const calcKpiScore = (actual: number | null, target: number | null): number | null => {
  if (actual === null || target === null || target === 0) return null;
  return (actual / target) * 100;
};

// Sales commission: each order's price (i.e. the period's total revenue)
// times the "Umumiy natijaga ta'siri (%)" weight configured on that
// employee's "revenue" KPI target. Null when no revenue target is configured
// — there's no agreed-upon rate to apply, so we don't fabricate one.
export const calcCommission = (revenue: number, revenueTargetWeight: number | null): number | null => {
  if (revenueTargetWeight === null) return null;
  return revenue * (revenueTargetWeight / 100);
};

// Returns null (not a sentinel 100%) when there's no previous-period baseline
// to compare against — a "growth rate from zero" isn't a real percentage.
export const pctChange = (current: number, previous: number): number | null => {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
};
