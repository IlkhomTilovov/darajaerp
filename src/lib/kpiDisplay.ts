export type KpiMetricKey = "revenue" | "average_check" | "conversion_rate" | "task_completion" | "orders_count";

export interface KpiMetricMeta {
  key: KpiMetricKey;
  label: string;
  unit: "so'm" | "%" | "ta";
}

export const KPI_METRICS: KpiMetricMeta[] = [
  { key: "revenue", label: "Savdo tushumi", unit: "so'm" },
  { key: "orders_count", label: "Muvaffaqiyatli buyurtmalar", unit: "ta" },
  { key: "average_check", label: "O'rtacha chek", unit: "so'm" },
  { key: "conversion_rate", label: "Liddan buyurtmaga konversiya", unit: "%" },
  { key: "task_completion", label: "Vazifalar bajarilishi", unit: "%" },
];

export const getKpiMetricMeta = (key: string): KpiMetricMeta => KPI_METRICS.find((m) => m.key === key) ?? { key: key as KpiMetricKey, label: key, unit: "ta" };

export const NO_DATA_LABEL = "Ma'lumot mavjud emas";

export const formatKpiValue = (value: number | null | undefined, unit: KpiMetricMeta["unit"]): string => {
  if (value === null || value === undefined) return NO_DATA_LABEL;
  if (unit === "so'm") return `${Math.round(value).toLocaleString()} so'm`;
  if (unit === "%") return `${value.toFixed(1)}%`;
  return `${Math.round(value)} ta`;
};

export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  rop: "ROP",
  sotuvchi: "Sotuvchi",
  super_admin: "Super Admin",
};

export const getRoleLabel = (role?: string | null) => (role ? ROLE_LABELS[role] ?? role : "—");
