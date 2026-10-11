import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, ShoppingCart, Copy, MessageSquare, Pencil, Bell, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useNavigate } from "react-router-dom";

const Admin = () => {
  const { user } = useAuth();
  const { isAdminOrRop, isAdmin, loading: roleLoading } = useUserRoles();
  const navigate = useNavigate();
  const [sellers, setSellers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
  const [telegramDialogOpen, setTelegramDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [telegramId, setTelegramId] = useState("");
  const [createdCredentials, setCreatedCredentials] = useState({ email: "", password: "" });
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    role: "sotuvchi" as "admin" | "rop" | "sotuvchi",
  });

  useEffect(() => {
    if (!roleLoading && !isAdminOrRop) {
      navigate("/");
      toast.error("Ruxsat yo'q");
    }
  }, [isAdminOrRop, roleLoading, navigate]);

  useEffect(() => {
    if (isAdminOrRop) {
      fetchSellers();
      fetchAllUsers();
      fetchCurrentUserProfile();
    }
  }, [isAdminOrRop]);

  const fetchCurrentUserProfile = async () => {
    try {
      if (!user) return;
      const data = await api.profiles.get(user.id);
      setCurrentUserProfile(data);
    } catch (error) {
      console.error("Error fetching current user profile:", error);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const data = await api.admin.listUsers();
      setAllUsers(data.map((p: any) => ({ ...p, user_roles: (p.roles ?? []).map((role: string) => ({ role })) })));
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchSellers = async () => {
    try {
      const [users, orders] = await Promise.all([api.admin.listUsers(), api.orders.list()]);
      const sellersOnly = users.filter((u: any) => (u.roles ?? []).includes("sotuvchi"));

      const sellersWithStats = sellersOnly.map((seller: any) => {
        const sellerOrders = orders.filter((o: any) => o.seller_id === seller.id);
        const totalOrders = sellerOrders.length;
        const totalRevenue = sellerOrders.reduce((sum: number, o: any) => sum + parseFloat(String(o.total_amount)), 0);

        return { ...seller, totalOrders, totalRevenue };
      });

      setSellers(sellersWithStats);
    } catch (error) {
      console.error("Error fetching sellers:", error);
      toast.error("Sotuvchilarni yuklashda xato");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSeller = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await api.admin.createUser(formData);

      // Save credentials to show in dialog
      setCreatedCredentials({
        email: formData.email,
        password: formData.password,
      });

      toast.success(formData.role === "sotuvchi" ? "Sotuvchi yaratildi!" : formData.role === "rop" ? "ROP yaratildi!" : "Admin yaratildi!");
      setDialogOpen(false);
      setCredentialsDialogOpen(true);

      // Reset form
      setFormData({
        email: "",
        password: "",
        full_name: "",
        phone: "",
        role: "sotuvchi",
      });
      fetchSellers();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Xatolik yuz berdi");
    } finally {
      setFormData({ email: "", password: "", full_name: "", phone: "", role: "sotuvchi" });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Nusxalandi!");
  };

  const handleSaveTelegramId = async () => {
    if (!selectedUser) return;
    
    try {
      await api.profiles.update(selectedUser.id, { telegram_user_id: telegramId || null });

      toast.success("Telegram ID saqlandi!");
      setTelegramDialogOpen(false);
      setSelectedUser(null);
      setTelegramId("");
      fetchAllUsers();
      fetchSellers();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Xatolik yuz berdi");
    }
  };

  const handleRemoveTelegramId = async (userId: string) => {
    try {
      await api.profiles.update(userId, { telegram_user_id: null });

      toast.success("Telegram ID o'chirildi!");
      fetchAllUsers();
      fetchSellers();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const openTelegramDialog = (user: any) => {
    setSelectedUser(user);
    setTelegramId(user.telegram_user_id || "");
    setTelegramDialogOpen(true);
  };

  if (roleLoading || loading) {
    return (
      <DashboardLayout>
        <div className="text-center text-muted-foreground">Yuklanmoqda...</div>
      </DashboardLayout>
    );
  }

  if (!isAdminOrRop) {
    return null;
  }

  // Telegram ID ulangan foydalanuvchilar
  const telegramLinkedUsers = allUsers.filter((u) => u.telegram_user_id);

  // Barcha foydalanuvchilar (Telegram ID qo'shish uchun)
  const availableUsersForTelegram = allUsers;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Admin Panel</h2>
            <p className="text-muted-foreground mt-2">
              Sotuvchilarni boshqarish
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Yangi sotuvchi
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Yangi sotuvchi yaratish</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateSeller} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">To'liq ism</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email (Login)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Parol</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Rol</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: "admin" | "rop" | "sotuvchi") =>
                      setFormData({ ...formData, role: value })
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

          {/* Credentials Display Dialog */}
          <Dialog open={credentialsDialogOpen} onOpenChange={setCredentialsDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Yangi sotuvchi ma'lumotlari</DialogTitle>
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

          {/* Telegram ID Dialog */}
          <Dialog open={telegramDialogOpen} onOpenChange={setTelegramDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Telegram ID sozlash</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="telegramId">Telegram ID</Label>
                  <Input
                    id="telegramId"
                    value={telegramId}
                    onChange={(e) => setTelegramId(e.target.value)}
                    placeholder="Masalan: 123456789"
                  />
                </div>
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-sm text-muted-foreground">
                    💡 Telegram ID ni olish uchun <a href="https://t.me/daraja_zakazs_bot" target="_blank" rel="noopener noreferrer" className="text-primary underline">@daraja_zakazs_bot</a> ga <code>/start</code> yuboring.
                  </p>
                </div>
                <Button onClick={handleSaveTelegramId} className="w-full">
                  Saqlash
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Jami sotuvchilar
              </CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sellers.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Jami zakazlar
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {sellers.reduce((sum, s) => sum + s.totalOrders, 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Jami daromad
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {sellers.reduce((sum, s) => sum + s.totalRevenue, 0).toLocaleString()} so'm
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Telegram Notifications Section - faqat admin uchun */}
        {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Telegram bildirishnomalari
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Kunlik hisobotlarni olish uchun foydalanuvchilarga Telegram ID qo'shing.
                Hisobotlar har kuni soat 21:00 da yuboriladi.
              </p>

              {/* Yangi foydalanuvchi qo'shish */}
              <div className="flex flex-col gap-2 rounded-md border border-border/50 bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <Label htmlFor="addTelegramUser" className="text-sm font-medium">Foydalanuvchi qo'shish</Label>
                  <Select onValueChange={(userId) => {
                    const user = availableUsersForTelegram.find(u => u.id === userId);
                    if (user) openTelegramDialog(user);
                  }}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Foydalanuvchi tanlang..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsersForTelegram.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <span>{user.full_name}</span>
                            <Badge variant="outline" className="text-xs">
                              {user.user_roles?.length
                                ? user.user_roles?.map((r: any) => r.role).join(", ")
                                : "sotuvchi"}
                            </Badge>
                            {user.telegram_user_id && (
                              <Badge variant="secondary" className="text-xs">
                                <MessageSquare className="h-3 w-3 mr-1" />
                                Ulangan
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Ulangan foydalanuvchilar ro'yxati */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ism</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Telegram ID</TableHead>
                      <TableHead>Amallar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {telegramLinkedUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Hech kim ulanmagan. Yuqoridagi ro'yxatdan foydalanuvchi tanlang.
                        </TableCell>
                      </TableRow>
                    ) : (
                      telegramLinkedUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.full_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {user.user_roles?.length
                                ? user.user_roles?.map((r: any) => r.role).join(", ")
                                : "sotuvchi"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <code className="bg-muted px-2 py-1 rounded text-sm">{user.telegram_user_id}</code>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openTelegramDialog(user)}>
                                <Pencil className="h-4 w-4 mr-1" />
                                O'zgartirish
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleRemoveTelegramId(user.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Sotuvchilar</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ism</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>Zakazlar</TableHead>
                    <TableHead>Daromad</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sellers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Sotuvchilar topilmadi
                      </TableCell>
                    </TableRow>
                  ) : (
                    sellers.map((seller) => (
                      <TableRow key={seller.id}>
                        <TableCell className="font-medium">{seller.full_name}</TableCell>
                        <TableCell>{seller.id}</TableCell>
                        <TableCell>{seller.phone || "-"}</TableCell>
                        <TableCell>{seller.totalOrders}</TableCell>
                        <TableCell>{seller.totalRevenue.toLocaleString()} so'm</TableCell>
                        <TableCell>
                          <Badge variant="default">Active</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Admin;
