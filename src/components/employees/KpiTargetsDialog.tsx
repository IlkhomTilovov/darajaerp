import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";
import { Target, Pencil, Trash2 } from "lucide-react";
import { KPI_METRICS, formatKpiValue, getKpiMetricMeta, getRoleLabel } from "@/lib/kpiDisplay";

const PERIOD_OPTIONS = [
  { value: "weekly", label: "Haftalik" },
  { value: "monthly", label: "Oylik" },
  { value: "quarterly", label: "Choraklik" },
];
const ALL_EMPLOYEES_VALUE = "all";
const ROLE_OPTIONS = ["sotuvchi", "rop"];

interface KpiTargetsDialogProps {
  onUpdate?: () => void;
}

const KpiTargetsDialog = ({ onUpdate }: KpiTargetsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [targets, setTargets] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    role: ROLE_OPTIONS[0],
    employee_id: ALL_EMPLOYEES_VALUE,
    metric_key: KPI_METRICS[0].key as string,
    target_value: "",
    weight: "100",
    period: "monthly",
  });
  const selectedMetricUnit = getKpiMetricMeta(formData.metric_key).unit;
  const employeeById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const employeesForRole = useMemo(
    () => employees.filter((e) => (e.roles ?? []).includes(formData.role)),
    [employees, formData.role],
  );

  useEffect(() => {
    if (open) {
      fetchTargets();
      fetchEmployees();
    }
  }, [open]);

  const fetchTargets = async () => {
    try {
      const data = await api.kpiTargets.list();
      setTargets(data);
    } catch (error) {
      console.error("Error fetching KPI targets:", error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await api.admin.listUsers();
      setEmployees(data);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ role: ROLE_OPTIONS[0], employee_id: ALL_EMPLOYEES_VALUE, metric_key: KPI_METRICS[0].key, target_value: "", weight: "100", period: "monthly" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetValue = Number(formData.target_value);
    if (!targetValue || targetValue <= 0) {
      toast.error("To'g'ri reja qiymatini kiriting");
      return;
    }

    try {
      if (editingId) {
        await api.kpiTargets.update(editingId, {
          target_value: targetValue,
          weight: Number(formData.weight) || 100,
          period: formData.period,
        });
        toast.success("Reja yangilandi");
      } else {
        await api.kpiTargets.create({
          role: formData.role,
          user_id: formData.employee_id === ALL_EMPLOYEES_VALUE ? null : formData.employee_id,
          metric_key: formData.metric_key,
          target_value: targetValue,
          weight: Number(formData.weight) || 100,
          period: formData.period,
        });
        toast.success("Reja qo'shildi");
      }
      resetForm();
      fetchTargets();
      onUpdate?.();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Saqlashda xato");
    }
  };

  const handleEdit = (target: any) => {
    setEditingId(target.id);
    setFormData({
      role: target.role,
      employee_id: target.user_id || ALL_EMPLOYEES_VALUE,
      metric_key: target.metric_key,
      target_value: String(target.target_value),
      weight: String(target.weight),
      period: target.period,
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await api.kpiTargets.remove(id);
      toast.success("Reja o'chirildi");
      fetchTargets();
      onUpdate?.();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "O'chirishda xato");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Target className="mr-2 h-4 w-4" />
          KPI maqsadlarini sozlash
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Xodimlar uchun reja (KPI) sozlash</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Xodim vazifasi</Label>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData({ ...formData, role: v, employee_id: ALL_EMPLOYEES_VALUE })}
                disabled={!!editingId}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role} value={role}>
                      {getRoleLabel(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Kimga tegishli</Label>
              <Select value={formData.employee_id} onValueChange={(v) => setFormData({ ...formData, employee_id: v })} disabled={!!editingId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_EMPLOYEES_VALUE}>Hammaga ({getRoleLabel(formData.role)})</SelectItem>
                  {employeesForRole.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Qaysi natija hisoblanadi</Label>
            <Select value={formData.metric_key} onValueChange={(v) => setFormData({ ...formData, metric_key: v })} disabled={!!editingId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KPI_METRICS.map((m) => (
                  <SelectItem key={m.key} value={m.key}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="target_value">Reja miqdori ({selectedMetricUnit}) *</Label>
              <Input
                id="target_value"
                type="number"
                min="0"
                value={formData.target_value}
                onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="weight">Umumiy natijaga ta'siri (%)</Label>
              <Input
                id="weight"
                type="number"
                min="1"
                max="100"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              />
            </div>
            <div>
              <Label>Reja muddati</Label>
              <Select value={formData.period} onValueChange={(v) => setFormData({ ...formData, period: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.employee_id !== ALL_EMPLOYEES_VALUE && (
            <p className="text-xs text-muted-foreground">
              Bu reja faqat <span className="font-medium text-foreground">{employeeById.get(formData.employee_id)?.full_name}</span> uchun
              qo'llanadi va shu xodim uchun "{getRoleLabel(formData.role)}" lavozimining umumiy rejasini ustidan bosib ketadi.
            </p>
          )}

          <div className="flex justify-end gap-2">
            {editingId && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Bekor qilish
              </Button>
            )}
            <Button type="submit">{editingId ? "Yangilash" : "Qo'shish"}</Button>
          </div>
        </form>

        <div className="space-y-2 border-t pt-4">
          <h3 className="mb-3 font-semibold">Sozlangan rejalar</h3>
          {targets.length === 0 && <p className="text-sm text-muted-foreground">Hali reja sozlanmagan</p>}
          {targets.map((target) => {
            const meta = getKpiMetricMeta(target.metric_key);
            const personalName = target.user_id ? employeeById.get(target.user_id)?.full_name : null;
            return (
              <div key={target.id} className="flex items-center justify-between rounded-lg bg-muted p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{getRoleLabel(target.role)}</Badge>
                    {target.user_id ? (
                      <Badge>{personalName || "Shaxsiy"}</Badge>
                    ) : (
                      <Badge variant="secondary">Hammaga</Badge>
                    )}
                    <span className="font-medium">{meta.label}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Reja: {formatKpiValue(Number(target.target_value), meta.unit)} · Ta'siri: {target.weight}% ·{" "}
                    {PERIOD_OPTIONS.find((p) => p.value === target.period)?.label}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(target)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(target.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KpiTargetsDialog;
