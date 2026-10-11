import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Package, TrendingDown, BarChart3, Plus, Minus, Edit2 } from "lucide-react";
import { format, subDays } from "date-fns";
import { toast } from "sonner";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface ProductStats {
  id: string;
  name: string;
  category: string | null;
  price: number;
  stock: number;
  totalSold: number;
  totalRevenue: number;
}

const Inventory = () => {
  const navigate = useNavigate();
  const { isAdmin, isRop, loading: rolesLoading } = useUserRoles();
  const [products, setProducts] = useState<ProductStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [chartData, setChartData] = useState<any[]>([]);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductStats | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState<number>(0);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract' | 'set'>('add');

  useEffect(() => {
    if (!rolesLoading && !isAdmin && !isRop) {
      navigate('/');
      toast.error("Bu sahifaga kirish huquqi yo'q");
    }
  }, [rolesLoading, isAdmin, isRop, navigate]);

  useEffect(() => {
    if (!rolesLoading && (isAdmin || isRop)) {
      fetchInventoryStats();
    }
  }, [rolesLoading, isAdmin, isRop, startDate, endDate]);

  const fetchInventoryStats = async () => {
    try {
      setLoading(true);
      const [productsData, ordersData] = await Promise.all([api.products.list(), api.orders.list()]);

      const startStr = format(startDate, "yyyy-MM-dd");
      const endStr = format(endDate, "yyyy-MM-dd");
      const ordersInRange = ordersData.filter(
        (o: any) => o.status !== "cancelled" && o.order_date >= startStr && o.order_date <= endStr,
      );
      const orderItems = ordersInRange.flatMap((o: any) => o.order_items || []);

      const productStats: ProductStats[] = productsData
        .sort((a: any, b: any) => a.name.localeCompare(b.name))
        .map((product: any) => {
          const productItems = orderItems.filter((item: any) => item.product_name.toLowerCase() === product.name.toLowerCase());
          return {
            id: product.id,
            name: product.name,
            category: product.category,
            price: Number(product.price),
            stock: product.stock || 0,
            totalSold: productItems.reduce((sum: number, item: any) => sum + item.quantity, 0),
            totalRevenue: productItems.reduce((sum: number, item: any) => sum + Number(item.price) * item.quantity, 0),
          };
        });
      productStats.sort((a, b) => b.totalSold - a.totalSold);
      setProducts(productStats);
      setChartData(productStats.slice(0, 10).map(p => ({ name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name, sotilgan: p.totalSold })));
    } catch (error) {
      toast.error("Ma'lumotlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenStockDialog = (product: ProductStats, type: 'add' | 'subtract' | 'set') => {
    setSelectedProduct(product);
    setAdjustmentType(type);
    setStockAdjustment(type === 'set' ? product.stock : 0);
    setStockDialogOpen(true);
  };

  const handleStockAdjustment = async () => {
    if (!selectedProduct) return;
    try {
      const newStock = adjustmentType === 'add' ? selectedProduct.stock + stockAdjustment : adjustmentType === 'subtract' ? Math.max(0, selectedProduct.stock - stockAdjustment) : Math.max(0, stockAdjustment);
      await api.products.update(selectedProduct.id, { stock: newStock });
      toast.success(`${selectedProduct.name} zaxirasi: ${newStock} ta`);
      setStockDialogOpen(false);
      fetchInventoryStats();
    } catch (error) {
      toast.error('Xatolik: ' + (error instanceof ApiError ? error.message : ''));
    }
  };

  const totalSold = products.reduce((sum, p) => sum + p.totalSold, 0);
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);

  if (rolesLoading || loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Yuklanmoqda...</p></div></DashboardLayout>;
  if (!isAdmin && !isRop) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold">Ombor</h1><p className="text-muted-foreground">Mahsulotlar va zaxira</p></div>

        <Card><CardContent className="pt-6"><div className="flex flex-wrap gap-2">
          {[7, 10, 20, 30, 365].map(d => <Button key={d} variant="outline" size="sm" onClick={() => { setStartDate(subDays(new Date(), d)); setEndDate(new Date()); }}>{d === 365 ? '1 yil' : d === 30 ? '1 oy' : `${d} kun`}</Button>)}
        </div></CardContent></Card>

        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><Package className="h-6 w-6 text-primary" /><div><p className="text-sm text-muted-foreground">Mahsulotlar</p><p className="text-2xl font-bold">{products.length}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><Package className="h-6 w-6 text-blue-500" /><div><p className="text-sm text-muted-foreground">Jami zaxira</p><p className="text-2xl font-bold">{totalStock} ta</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><TrendingDown className="h-6 w-6 text-green-500" /><div><p className="text-sm text-muted-foreground">Sotilgan</p><p className="text-2xl font-bold">{totalSold} ta</p></div></div></CardContent></Card>
          <Card className={products.filter(p => p.stock === 0).length > 0 ? "border-destructive" : ""}><CardContent className="pt-6"><div className="flex items-center gap-4"><Package className="h-6 w-6 text-destructive" /><div><p className="text-sm text-muted-foreground">Tugagan</p><p className="text-2xl font-bold text-destructive">{products.filter(p => p.stock === 0).length}</p></div></div></CardContent></Card>
        </div>

        {chartData.length > 0 && <Card><CardHeader><CardTitle>Top 10 sotilgan</CardTitle></CardHeader><CardContent><div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="name" type="category" width={120} /><Tooltip /><Bar dataKey="sotilgan" fill="hsl(var(--primary))" name="Sotilgan" /></BarChart></ResponsiveContainer></div></CardContent></Card>}

        <Card><CardHeader><CardTitle>Mahsulotlar</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Nomi</TableHead><TableHead>Narxi</TableHead><TableHead>Zaxira</TableHead><TableHead>Sotilgan</TableHead><TableHead>Amallar</TableHead></TableRow></TableHeader><TableBody>
          {products.map(p => <TableRow key={p.id} className={p.stock === 0 ? "bg-destructive/5" : p.stock < 10 ? "bg-warning/5" : ""}>
            <TableCell className="font-medium">{p.name}</TableCell>
            <TableCell>{p.price.toLocaleString()} so'm</TableCell>
            <TableCell><span className={p.stock === 0 ? "text-destructive font-bold" : p.stock < 10 ? "text-warning font-medium" : "text-green-600"}>{p.stock} ta</span></TableCell>
            <TableCell>{p.totalSold} ta</TableCell>
            <TableCell><div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => handleOpenStockDialog(p, 'add')} className="h-8 w-8 p-0"><Plus className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => handleOpenStockDialog(p, 'subtract')} className="h-8 w-8 p-0"><Minus className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => handleOpenStockDialog(p, 'set')} className="h-8 w-8 p-0"><Edit2 className="h-4 w-4" /></Button>
            </div></TableCell>
          </TableRow>)}
        </TableBody></Table></CardContent></Card>

        <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
          <DialogContent><DialogHeader><DialogTitle>{adjustmentType === 'add' ? "Qo'shish" : adjustmentType === 'subtract' ? 'Kamaytirish' : 'Belgilash'} - {selectedProduct?.name}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex justify-between"><span>Hozirgi:</span><span className="font-bold">{selectedProduct?.stock} ta</span></div>
              <div><Label>Miqdor</Label><Input type="number" min={0} value={stockAdjustment} onChange={e => setStockAdjustment(parseInt(e.target.value) || 0)} /></div>
              <div className="flex justify-between border-t pt-2"><span>Yangi:</span><span className="font-bold text-primary">{adjustmentType === 'add' ? (selectedProduct?.stock || 0) + stockAdjustment : adjustmentType === 'subtract' ? Math.max(0, (selectedProduct?.stock || 0) - stockAdjustment) : Math.max(0, stockAdjustment)} ta</span></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setStockDialogOpen(false)}>Bekor</Button><Button onClick={handleStockAdjustment}>Saqlash</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Inventory;
