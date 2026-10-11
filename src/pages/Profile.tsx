import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { User, Phone, Mail, Calendar, TrendingUp, ShoppingCart, UserPlus, Copy } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { useUserRoles } from "@/hooks/useUserRoles";

const Profile = () => {
  const { user } = useAuth();
  const { isAdminOrRop } = useUserRoles();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    thisMonth: { orders: 0, revenue: 0 },
    lastMonth: { orders: 0, revenue: 0 },
    total: { orders: 0, revenue: 0 },
  });
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
  });
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState({ email: "", password: "" });
  const [newUserData, setNewUserData] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    role: "sotuvchi" as "admin" | "rop" | "sotuvchi",
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchStats();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      if (!user) return;
      const data = await api.profiles.get(user.id);
      setProfile(data);
      setFormData({
        full_name: data.full_name || "",
        phone: data.phone || "",
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      if (!user) return;

      const thisMonthStart = startOfMonth(new Date());
      const thisMonthEnd = endOfMonth(new Date());
      const lastMonthStart = startOfMonth(subMonths(new Date(), 1));
      const lastMonthEnd = endOfMonth(subMonths(new Date(), 1));

      const allOrders = await api.orders.list();
      const ownOrders = allOrders.filter((o: any) => o.seller_id === user.id);

      const inRange = (dateStr: string, start: Date, end: Date) => {
        const d = format(start, "yyyy-MM-dd");
        const e = format(end, "yyyy-MM-dd");
        return dateStr >= d && dateStr <= e;
      };

      const thisMonthOrders = ownOrders.filter((o: any) => inRange(o.order_date, thisMonthStart, thisMonthEnd));
      const lastMonthOrders = ownOrders.filter((o: any) => inRange(o.order_date, lastMonthStart, lastMonthEnd));

      const calculateStats = (orders: any[]) => ({
        orders: orders?.length || 0,
        revenue: orders?.reduce((sum, o) => sum + parseFloat(String(o.total_amount)), 0) || 0,
      });

      setStats({
        thisMonth: calculateStats(thisMonthOrders),
        lastMonth: calculateStats(lastMonthOrders),
        total: calculateStats(ownOrders),
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (!user) return;
      await api.profiles.update(user.id, {
        full_name: formData.full_name,
        phone: formData.phone,
      });

      toast.success("Profil yangilandi!");
      fetchProfile();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await api.admin.createUser(newUserData);

      setCreatedCredentials({
        email: newUserData.email,
        password: newUserData.password,
      });

      toast.success("Foydalanuvchi yaratildi!");
      setCreateUserDialogOpen(false);
      setCredentialsDialogOpen(true);

      setNewUserData({
        email: "",
        password: "",
        full_name: "",
        phone: "",
        role: "sotuvchi",
      });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Xatolik yuz berdi");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Nusxalandi!");
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center text-muted-foreground">Yuklanmoqda...</div>
      </DashboardLayout>
    );
  }

  const growth = stats.lastMonth.revenue > 0
    ? ((stats.thisMonth.revenue - stats.lastMonth.revenue) / stats.lastMonth.revenue) * 100
    : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Profil</h2>
            <p className="text-muted-foreground mt-2">
              Shaxsiy ma'lumotlar va statistika
            </p>
          </div>
          {isAdminOrRop && (
            <Dialog open={createUserDialogOpen} onOpenChange={setCreateUserDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Yangi foydalanuvchi
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Yangi foydalanuvchi yaratish</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new_full_name">To'liq ism</Label>
                    <Input
                      id="new_full_name"
                      value={newUserData.full_name}
                      onChange={(e) => setNewUserData({ ...newUserData, full_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new_email">Email</Label>
                    <Input
                      id="new_email"
                      type="email"
                      value={newUserData.email}
                      onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new_password">Parol</Label>
                    <Input
                      id="new_password"
                      type="password"
                      value={newUserData.password}
                      onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new_phone">Telefon</Label>
                    <Input
                      id="new_phone"
                      value={newUserData.phone}
                      onChange={(e) => setNewUserData({ ...newUserData, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Rol</Label>
                    <Select
                      value={newUserData.role}
                      onValueChange={(value: "admin" | "rop" | "sotuvchi") =>
                        setNewUserData({ ...newUserData, role: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="rop">ROP</SelectItem>
                        <SelectItem value="sotuvchi">Sotuvchi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full">
                    Yaratish
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Credentials Display Dialog */}
        <Dialog open={credentialsDialogOpen} onOpenChange={setCredentialsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Yangi foydalanuvchi ma'lumotlari</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Email (Login)</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    value={createdCredentials.email} 
                    readOnly 
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(createdCredentials.email)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Parol</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    value={createdCredentials.password} 
                    readOnly 
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(createdCredentials.password)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm text-muted-foreground">
                  ⚠️ Bu ma'lumotlarni xavfsiz joyda saqlang. Parolni qayta ko'ra olmaysiz.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Shaxsiy ma'lumotlar</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">
                    <User className="h-4 w-4 inline mr-2" />
                    To'liq ism
                  </Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">
                    <Phone className="h-4 w-4 inline mr-2" />
                    Telefon
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    <Mail className="h-4 w-4 inline mr-2" />
                    Email
                  </Label>
                  <Input value={user?.email} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>
                    <Calendar className="h-4 w-4 inline mr-2" />
                    Ro'yxatdan o'tgan
                  </Label>
                  <Input
                    value={format(new Date(profile?.created_at), "dd.MM.yyyy")}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? "Saqlanmoqda..." : "Saqlash"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Joriy oy statistikasi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                    <span className="text-muted-foreground">Zakazlar</span>
                  </div>
                  <span className="text-2xl font-bold">{stats.thisMonth.orders}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-success" />
                    <span className="text-muted-foreground">Daromad</span>
                  </div>
                  <span className="text-2xl font-bold">
                    {stats.thisMonth.revenue.toLocaleString()} so'm
                  </span>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm">
                    <span className={growth >= 0 ? "text-success" : "text-destructive"}>
                      {growth >= 0 ? "+" : ""}{growth.toFixed(1)}%
                    </span>
                    <span className="text-muted-foreground">o'tgan oyga nisbatan</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Jami statistika</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Jami zakazlar</span>
                  <span className="text-xl font-bold">{stats.total.orders}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Jami daromad</span>
                  <span className="text-xl font-bold">
                    {stats.total.revenue.toLocaleString()} so'm
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
