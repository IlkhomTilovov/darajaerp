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
import { Plus, Calendar, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { regionsData } from "@/lib/regions";
import { useUserRoles } from "@/hooks/useUserRoles";
import { OrderConfirmDialog } from "@/components/OrderConfirmDialog";

const Orders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [products, setProducts] = useState<any[]>([]);
  const [availableDistricts, setAvailableDistricts] = useState<string[]>([]);
  const { isAdmin } = useUserRoles();
  const { user } = useAuth();
  
  const [items, setItems] = useState<Array<{
    product_id: string;
    product_name: string;
    quantity: string;
    price: string;
  }>>([]);
  
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_phone: "",
    customer_phone2: "",
    advance_payment: "",
    region: "",
    district: "",
    notes: "",
  });

  useEffect(() => {
    if (user) {
      fetchOrders();
      fetchProducts();
    }
  }, [user]);

  useEffect(() => {
    filterOrders();
  }, [orders, startDate, endDate, filterStatus]);

  // Update districts when region changes
  useEffect(() => {
    if (formData.region) {
      setAvailableDistricts(regionsData[formData.region] || []);
    } else {
      setAvailableDistricts([]);
    }
  }, [formData.region]);

  const fetchProducts = async () => {
    try {
      const data = await api.products.list();
      setProducts(data.sort((a: any, b: any) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchOrders = async () => {
    try {
      if (!user) return;

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = format(sevenDaysAgo, "yyyy-MM-dd");

      const allOrders = await api.orders.list();
      const ownRecent = allOrders
        .filter((o: any) => o.seller_id === user.id && o.order_date >= sevenDaysAgoStr)
        .sort((a: any, b: any) => (a.created_at < b.created_at ? 1 : -1))
        .map((o: any) => ({ ...o, items: o.order_items || [] }));

      setOrders(ownRecent);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Zakazlarni yuklashda xato");
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await api.orders.update(orderId, { status: newStatus });

      // Sync status change to Google Sheets
      try {
        await api.integrations.triggerSheetsSync();
      } catch (sheetsError) {
        console.error('Google Sheets sync error:', sheetsError);
      }

      toast.success("Zakaz statusi yangilandi!");
      fetchOrders();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Xatolik yuz berdi");
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];

    if (startDate) {
      filtered = filtered.filter(order => 
        new Date(order.order_date) >= startDate
      );
    }

    if (endDate) {
      filtered = filtered.filter(order => 
        new Date(order.order_date) <= endDate
      );
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter(order => order.status === filterStatus);
    }

    setFilteredOrders(filtered);
  };

  const addProductToOrder = (product: any) => {
    const existingIndex = items.findIndex(item => item.product_id === product.id);
    
    if (existingIndex >= 0) {
      // Increase quantity if product already added
      const newItems = [...items];
      newItems[existingIndex].quantity = (parseInt(newItems[existingIndex].quantity) + 1).toString();
      setItems(newItems);
    } else {
      // Add new product
      setItems([...items, {
        product_id: product.id,
        product_name: product.name,
        quantity: "1",
        price: product.price.toString()
      }]);
    }
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      return sum + (parseInt(item.quantity) * parseFloat(item.price));
    }, 0);
  };

  const calculateRemaining = () => {
    const total = calculateTotal();
    const advance = parseFloat(formData.advance_payment) || 0;
    return Math.max(0, total - advance);
  };

  const handleEdit = (order: any) => {
    setEditingOrder(order);
    setFormData({
      customer_name: order.customer_name,
      customer_phone: order.customer_phone || "",
      customer_phone2: order.customer_phone2 || "",
      advance_payment: order.advance_payment?.toString() || "0",
      region: order.region || "",
      district: order.district || "",
      notes: order.notes || "",
    });
    if (order.region && regionsData[order.region]) {
      setAvailableDistricts(regionsData[order.region]);
    }
    setItems(order.items.map((item: any) => ({
      product_id: item.product_id || "",
      product_name: item.product_name,
      quantity: item.quantity.toString(),
      price: item.price.toString(),
    })));
    setDialogOpen(true);
  };

  const handleQuickStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      await api.orders.update(orderId, { status: newStatus });

      // Sync status change to Google Sheets
      try {
        await api.integrations.triggerSheetsSync();
      } catch (sheetsError) {
        console.error('Google Sheets sync error:', sheetsError);
      }

      toast.success("Status yangilandi!");
      fetchOrders();
    } catch (error) {
      toast.error("Xatolik: " + (error instanceof ApiError ? error.message : ""));
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) return;
    
    // For new orders, show confirmation dialog
    if (!editingOrder) {
      setConfirmDialogOpen(true);
    } else {
      // For editing, submit directly
      submitOrder();
    }
  };

  const submitOrder = async () => {
    setIsSubmitting(true);
    setConfirmDialogOpen(false);

    try {
      if (!user) return;

      const totalAmount = items.reduce((sum, item) => {
        return sum + (parseInt(item.quantity) * parseFloat(item.price));
      }, 0);

      const advancePayment = parseFloat(formData.advance_payment) || 0;
      const orderItems = items.map(item => ({
        product_name: item.product_name,
        quantity: parseInt(item.quantity),
        price: parseFloat(item.price),
      }));

      if (editingOrder) {
        await api.orders.update(editingOrder.id, {
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone,
          customer_phone2: formData.customer_phone2,
          total_amount: totalAmount,
          advance_payment: advancePayment,
          region: formData.region,
          district: formData.district,
          notes: formData.notes,
          items: orderItems,
        });

        toast.success("Zakaz yangilandi!");
      } else {
        await api.orders.create({
          seller_id: user.id,
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone,
          customer_phone2: formData.customer_phone2,
          total_amount: totalAmount,
          advance_payment: advancePayment,
          status: "pending",
          region: formData.region,
          district: formData.district,
          notes: formData.notes,
          items: orderItems,
        });

        // Sync to Google Sheets via Apps Script trigger
        try {
          await api.integrations.triggerSheetsSync();
        } catch (sheetsError) {
          console.error('Google Sheets sync error:', sheetsError);
        }

        toast.success("Zakaz qo'shildi!");
      }

      setDialogOpen(false);
      setEditingOrder(null);
      setFormData({
        customer_name: "",
        customer_phone: "",
        customer_phone2: "",
        advance_payment: "",
        region: "",
        district: "",
        notes: "",
      });
      setAvailableDistricts([]);
      setItems([]);
      fetchOrders();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Xatolik yuz berdi");
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingOrder(null);
    setFormData({
      customer_name: "",
      customer_phone: "",
      customer_phone2: "",
      advance_payment: "",
      region: "",
      district: "",
      notes: "",
    });
    setAvailableDistricts([]);
    setItems([]);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: "secondary", label: "Jarayonda" },
      delivered: { variant: "default", label: "Tugallandi" },
      cancelled: { variant: "destructive", label: "Bekor qilindi" },
    };
    
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center text-muted-foreground">Yuklanmoqda...</div>
      </DashboardLayout>
    );
  }

  return (
    <>
      <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Zakazlar (oxirgi 7 kun)</h1>
            <p className="text-muted-foreground mt-1">
              {filteredOrders.length} ta zakaz
            </p>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Qidirish..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Yangi zakaz
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingOrder ? "Zakazni tahrirlash" : "Yangi zakaz qo'shish"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_name">Mijoz ismi</Label>
                  <Input
                    id="customer_name"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer_phone">Telefon 1</Label>
                    <Input
                      id="customer_phone"
                      value={formData.customer_phone}
                      onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer_phone2">Telefon 2</Label>
                    <Input
                      id="customer_phone2"
                      value={formData.customer_phone2}
                      onChange={(e) => setFormData({ ...formData, customer_phone2: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="region">Viloyat</Label>
                    <Select 
                      value={formData.region} 
                      onValueChange={(value) => {
                        setFormData({ ...formData, region: value, district: "" });
                      }}
                    >
                      <SelectTrigger id="region">
                        <SelectValue placeholder="Viloyatni tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(regionsData).map((regionName) => (
                          <SelectItem key={regionName} value={regionName}>
                            {regionName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="district">Tuman</Label>
                    <Select 
                      value={formData.district} 
                      onValueChange={(value) => setFormData({ ...formData, district: value })}
                      disabled={!formData.region}
                    >
                      <SelectTrigger id="district">
                        <SelectValue placeholder="Tumanni tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableDistricts.map((district) => (
                          <SelectItem key={district} value={district}>
                            {district}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="advance_payment">Avans to'lovi (so'm)</Label>
                  <Input
                    id="advance_payment"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.advance_payment}
                    onChange={(e) => setFormData({ ...formData, advance_payment: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Izoh</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Qo'shimcha ma'lumot..."
                    rows={3}
                  />
                </div>

                <div className="space-y-4 border-t pt-4">
                  <Label>Mahsulotlarni tanlang</Label>
                  
                  {/* Product selection grid */}
                  <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto p-1">
                    {products.map((product) => (
                      <Card 
                        key={product.id}
                        className="cursor-pointer hover:border-primary transition-colors overflow-hidden"
                        onClick={() => addProductToOrder(product)}
                      >
                        {product.image_url ? (
                          <div className="aspect-square relative overflow-hidden bg-muted">
                            <img 
                              src={product.image_url} 
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="aspect-square bg-muted flex items-center justify-center">
                            <span className="text-muted-foreground text-xs">Rasm yo'q</span>
                          </div>
                        )}
                        <CardContent className="p-3">
                          <h4 className="font-medium text-sm line-clamp-1">{product.name}</h4>
                          <p className="text-xs text-primary font-semibold mt-1">
                            {product.price.toLocaleString()} so'm
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Selected products */}
                  {items.length > 0 && (
                    <div className="space-y-2 border-t pt-4">
                      <Label>Tanlangan mahsulotlar</Label>
                      {items.map((item, index) => (
                        <Card key={index} className="p-3">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{item.product_name}</span>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => removeItem(index)}
                              >
                                O'chirish
                              </Button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="space-y-1">
                                <Label htmlFor={`quantity_${index}`} className="text-xs">Soni</Label>
                                <Input
                                  id={`quantity_${index}`}
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateItem(index, "quantity", e.target.value)}
                                  className="h-8"
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor={`price_${index}`} className="text-xs">Narxi</Label>
                                <Input
                                  id={`price_${index}`}
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.price}
                                  onChange={(e) => updateItem(index, "price", e.target.value)}
                                  className="h-8"
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Jami</Label>
                                <div className="h-8 flex items-center text-sm font-semibold">
                                  {(parseInt(item.quantity) * parseFloat(item.price)).toLocaleString()} so'm
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Summary */}
                  {items.length > 0 && (
                    <div className="space-y-2 bg-muted p-4 rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span>Jami summa:</span>
                        <span className="font-semibold">{calculateTotal().toLocaleString()} so'm</span>
                      </div>
                      {formData.advance_payment && parseFloat(formData.advance_payment) > 0 && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span>Avans:</span>
                            <span className="font-semibold text-primary">
                              -{parseFloat(formData.advance_payment).toLocaleString()} so'm
                            </span>
                          </div>
                          <div className="flex justify-between text-base font-bold border-t pt-2">
                            <span>Qolgan summa:</span>
                            <span className="text-primary">{calculateRemaining().toLocaleString()} so'm</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
                
                <Button type="submit" className="w-full" disabled={items.length === 0}>
                  {editingOrder ? "Yangilash" : "Saqlash"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtr</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Boshlanish sanasi</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Tanlang"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent mode="single" selected={startDate} onSelect={setStartDate} />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label>Tugash sanasi</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Tanlang"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent mode="single" selected={endDate} onSelect={setEndDate} />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Barchasi</SelectItem>
                    <SelectItem value="pending">Jarayonda</SelectItem>
                    <SelectItem value="delivered">Tugallandi</SelectItem>
                    <SelectItem value="cancelled">Bekor qilindi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {(startDate || endDate || filterStatus !== "all") && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setStartDate(undefined);
                  setEndDate(undefined);
                  setFilterStatus("all");
                }}
              >
                Filtrni tozalash
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Sana</TableHead>
                    <TableHead>Mijoz</TableHead>
                    <TableHead>Manzil</TableHead>
                    <TableHead>Mahsulotlar</TableHead>
                    <TableHead>Jami</TableHead>
                    <TableHead>Avans</TableHead>
                    <TableHead>Qolgan</TableHead>
                    <TableHead>Izoh</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amallar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders
                    .filter((order) => {
                      if (!searchQuery) return true;
                      const query = searchQuery.toLowerCase();
                      return (
                        order.customer_name.toLowerCase().includes(query) ||
                        order.customer_phone?.toLowerCase().includes(query) ||
                        order.region?.toLowerCase().includes(query) ||
                        order.district?.toLowerCase().includes(query) ||
                        order.order_number?.toString().includes(query)
                      );
                    })
                    .length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                        Zakazlar topilmadi
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders
                      .filter((order) => {
                        if (!searchQuery) return true;
                        const query = searchQuery.toLowerCase();
                        return (
                          order.customer_name.toLowerCase().includes(query) ||
                          order.customer_phone?.toLowerCase().includes(query) ||
                          order.region?.toLowerCase().includes(query) ||
                          order.district?.toLowerCase().includes(query) ||
                          order.order_number?.toString().includes(query)
                        );
                      })
                      .map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm">
                          {order.order_number}
                        </TableCell>
                        <TableCell>{format(new Date(order.order_date), "dd.MM.yyyy")}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{order.customer_name}</div>
                            {order.customer_phone && (
                              <div className="text-sm text-muted-foreground">{order.customer_phone}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {order.region && <div className="font-medium">{order.region}</div>}
                            {order.district && <div className="text-muted-foreground">{order.district}</div>}
                            {!order.region && !order.district && <span className="text-muted-foreground">-</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {order.items && order.items.length > 0 ? (
                              order.items.map((item: any, idx: number) => (
                                <div key={idx} className="text-sm">
                                  {item.product_name} x{item.quantity}
                                </div>
                              ))
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {parseFloat(String(order.total_amount)).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {parseFloat(String(order.advance_payment || 0)).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {(parseFloat(String(order.total_amount)) - parseFloat(String(order.advance_payment || 0))).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm max-w-[200px] truncate">
                            {order.notes || <span className="text-muted-foreground">-</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {isAdmin ? (
                            <Select
                              value={order.status}
                              onValueChange={(value) => handleQuickStatusUpdate(order.id, value)}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Jarayonda</SelectItem>
                                <SelectItem value="delivered">Tugallandi</SelectItem>
                                <SelectItem value="cancelled">Bekor qilindi</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            getStatusBadge(order.status)
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(order)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                  </Table>
                </div>

                {/* Statistics */}
                {filteredOrders.length > 0 && (
                  <Card className="mt-4">
                    <CardContent className="p-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="flex flex-col">
                          <span className="text-sm text-muted-foreground mb-1">Jami zakazlar</span>
                          <span className="text-2xl font-bold text-primary">
                            {filteredOrders.length} ta
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-muted-foreground mb-1">Jami savdo</span>
                          <span className="text-2xl font-bold text-primary">
                            {filteredOrders.reduce((sum, order) => sum + parseFloat(String(order.total_amount)), 0).toLocaleString()} so'm
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </div>
        </DashboardLayout>

        {/* Order Confirmation Dialog */}
        <OrderConfirmDialog
          open={confirmDialogOpen}
          onOpenChange={setConfirmDialogOpen}
          onConfirm={submitOrder}
          customerName={formData.customer_name}
          customerPhone={formData.customer_phone}
          customerPhone2={formData.customer_phone2}
          region={formData.region}
          district={formData.district}
          items={items}
          totalAmount={calculateTotal()}
          advancePayment={parseFloat(formData.advance_payment) || 0}
          notes={formData.notes}
          isSubmitting={isSubmitting}
        />
      </>
    );
  };
    
export default Orders;
