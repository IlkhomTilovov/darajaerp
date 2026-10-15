import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";
import { useUserRoles } from "@/hooks/useUserRoles";
import { format } from "date-fns";
import { CalendarIcon, User, Phone, DollarSign, Facebook, Send, CheckCircle2, Clock, Plus, MessageSquare, Trash2, Truck, Package, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface LeadDetailsDialogProps {
  lead: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  sellers: any[];
  stages: any[];
}

const DELIVERY_STATUS_OPTIONS = [
  { value: "Jarayonda", label: "Jarayonda", color: "bg-yellow-500" },
  { value: "Tasdiqlandi", label: "Tasdiqlandi", color: "bg-green-500" },
  { value: "Bekor bo'ldi", label: "Bekor bo'ldi", color: "bg-red-500" }
];

const LeadDetailsDialog = ({ lead, open, onOpenChange, onUpdate, sellers, stages }: LeadDetailsDialogProps) => {
  const { isAdminOrRop } = useUserRoles();
  const [tasks, setTasks] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [selectedSeller, setSelectedSeller] = useState(lead?.seller_id || "");
  const [selectedStage, setSelectedStage] = useState(lead?.stage || "");
  const [price, setPrice] = useState(lead?.price?.toString() || "");
  const [notes, setNotes] = useState(lead?.notes || "");
  const [deliveryStatus, setDeliveryStatus] = useState(lead?.delivery_status || "");
  const [selectedProduct, setSelectedProduct] = useState(lead?.product_name || "");
  const [products, setProducts] = useState<any[]>([]);
  const [linkedOrder, setLinkedOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<{ product_name: string; quantity: number; price: number }[]>([]);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    due_date: new Date(),
    due_time: "12:00",
    showForm: false
  });

  const sellerName = (id: string) => sellers.find((s) => s.id === id)?.full_name || "Foydalanuvchi";

  useEffect(() => {
    if (open && lead) {
      fetchTasks();
      fetchComments();
      setSelectedSeller(lead.seller_id);
      setSelectedStage(lead.stage || "");
      setPrice(lead.price?.toString() || "");
      setNotes(lead.notes || "");
      setDeliveryStatus(lead.delivery_status || "");
      setSelectedProduct(lead.product_name || "");
      fetchProducts();

      // A lead auto-creates its order the moment it enters "Sotildi" (see
      // server/src/routes/leads.ts), so by the time this dialog can show the
      // products section, that order already exists — just find and load it.
      if (stages.find((s) => s.id === lead.stage)?.name === "Sotildi") {
        fetchOrderData();
      } else {
        setLinkedOrder(null);
        setOrderItems([]);
      }
    }
  }, [open, lead]);

  const fetchProducts = async () => {
    try {
      const productsData = await api.products.list();
      setProducts(productsData);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchOrderData = async () => {
    try {
      const ordersData = await api.orders.list();
      const order = ordersData.find((o: any) => o.lead_id === lead.id) || null;
      setLinkedOrder(order);
      setOrderItems(
        (order?.order_items || []).map((i: any) => ({
          product_name: i.product_name,
          quantity: i.quantity,
          price: Number(i.price),
        })),
      );
    } catch (error) {
      console.error("Error fetching order products:", error);
    }
  };

  const addProduct = (product: any) => {
    setOrderItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.product_name === product.name);
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = { ...next[existingIndex], quantity: next[existingIndex].quantity + 1 };
        return next;
      }
      return [...prev, { product_name: product.name, quantity: 1, price: Number(product.price) || 0 }];
    });
  };

  const removeProduct = (index: number) => {
    setOrderItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateProductQuantity = (index: number, quantity: number) => {
    setOrderItems((prev) => prev.map((item, i) => (i === index ? { ...item, quantity: Math.max(1, quantity) } : item)));
  };

  const handleSaveProducts = async () => {
    if (!linkedOrder) return;

    try {
      const updated = await api.orders.update(linkedOrder.id, { items: orderItems });
      setLinkedOrder(updated);
      toast.success("Mahsulotlar saqlandi");
    } catch (error) {
      console.error("Error saving order products:", error);
      toast.error(error instanceof ApiError ? error.message : "Mahsulotlarni saqlashda xato");
    }
  };

  const fetchTasks = async () => {
    try {
      const all = await api.tasks.list();
      const leadTasks = all
        .filter((t: any) => t.lead_id === lead.id)
        .sort((a: any, b: any) => (a.created_at < b.created_at ? 1 : -1));
      setTasks(leadTasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  const fetchComments = async () => {
    try {
      const data = await api.leads.comments.list(lead.id);
      setComments(data.map((c: any) => ({ ...c, profiles: { full_name: sellerName(c.user_id) } })));
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  const handleAddTask = async () => {
    if (!taskForm.title) {
      toast.error("Vazifa nomini kiriting");
      return;
    }

    try {
      const [hours, minutes] = taskForm.due_time.split(":");
      const dueDateTime = new Date(taskForm.due_date);
      dueDateTime.setHours(parseInt(hours), parseInt(minutes));

      await api.tasks.create({
        title: taskForm.title.trim(),
        description: taskForm.description?.trim() || null,
        due_date: dueDateTime.toISOString(),
        seller_id: lead.seller_id,
        lead_id: lead.id,
        status: "pending",
      });

      toast.success("Vazifa qo'shildi");
      setTaskForm({ title: "", description: "", due_date: new Date(), due_time: "12:00", showForm: false });
      fetchTasks();
    } catch (error) {
      console.error("Error adding task:", error);
      toast.error(error instanceof ApiError ? error.message : "Vazifa qo'shishda xato");
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      await api.leads.comments.create(lead.id, newComment);
      toast.success("Izoh qo'shildi");
      setNewComment("");
      fetchComments();
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Izoh qo'shishda xato");
    }
  };

  const handleUpdateSeller = async () => {
    if (!isAdminOrRop || selectedSeller === lead.seller_id) return;

    try {
      await api.leads.update(lead.id, { seller_id: selectedSeller, employee: sellerName(selectedSeller) });
      await Promise.all(tasks.map((t) => api.tasks.update(t.id, { seller_id: selectedSeller })));

      toast.success("Xodim, vazifalar va izohlar o'zgartirildi");
      onUpdate();
      fetchTasks();
    } catch (error) {
      console.error("Error updating seller:", error);
      toast.error("Xodimni o'zgartirishda xato");
    }
  };

  const handleUpdatePrice = async () => {
    const isSoldStage = currentStage?.name === "Sotildi";
    if (isSoldStage && !price) {
      toast.error("Sotildi bosqichida narx kiritish majburiy");
      return;
    }

    try {
      await api.leads.update(lead.id, { price: price ? parseFloat(price) : null });
      toast.success("Narx saqlandi");
      onUpdate();
    } catch (error) {
      console.error("Error updating price:", error);
      toast.error("Narxni saqlashda xato");
    }
  };

  const handleUpdateProduct = async (productName: string) => {
    try {
      await api.leads.update(lead.id, { product_name: productName || null });
      setSelectedProduct(productName);
      toast.success("Mahsulot saqlandi");
      onUpdate();
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error("Mahsulotni saqlashda xato");
    }
  };

  const handleUpdateNotes = async () => {
    try {
      await api.leads.update(lead.id, { notes });
      toast.success("Izoh saqlandi");
      onUpdate();
    } catch (error) {
      console.error("Error updating notes:", error);
      toast.error("Izohni saqlashda xato");
    }
  };

  const handleUpdateDeliveryStatus = async (newStatus: string) => {
    try {
      await api.leads.update(lead.id, { delivery_status: newStatus });
      setDeliveryStatus(newStatus);
      toast.success("Yetkazish holati saqlandi");
      onUpdate();
    } catch (error) {
      console.error("Error updating delivery status:", error);
      toast.error("Yetkazish holatini saqlashda xato");
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";

    try {
      await api.tasks.update(taskId, { status: newStatus });
      toast.success(newStatus === "completed" ? "Vazifa bajarildi" : "Vazifa qayta ochildi");
      fetchTasks();
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Vazifa holatini o'zgartirishda xato");
    }
  };

  const handleDeleteLead = async () => {
    if (!confirm("Haqiqatan ham bu lidni o'chirmoqchimisiz?")) return;

    try {
      await api.leads.remove(lead.id);
      toast.success("Lid muvaffaqiyatli o'chirildi");
      onOpenChange(false);
      onUpdate();
    } catch (error) {
      console.error("Error deleting lead:", error);
      toast.error("Lidni o'chirishda xato: " + (error instanceof ApiError ? error.message : ""));
    }
  };

  const handleUpdateStage = async (newStageId: string) => {
    try {
      await api.leads.update(lead.id, { stage: newStageId });
      setSelectedStage(newStageId);
      toast.success("Bosqich o'zgartirildi");
      onUpdate();

      // Switching to "Sotildi" right here reveals the products section
      // immediately (isSoldStage reacts to local selectedStage), but the
      // order behind it was only just auto-created server-side — load it
      // now instead of waiting for the dialog to be reopened.
      if (stages.find((s) => s.id === newStageId)?.name === "Sotildi") {
        fetchOrderData();
      }
    } catch (error) {
      console.error("Error updating stage:", error);
      toast.error("Bosqichni o'zgartirishda xato");
    }
  };

  const currentStage = stages.find(s => s.id === selectedStage);
  const isSoldStage = currentStage?.name === "Sotildi";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-2xl">{lead?.customer_name}</DialogTitle>
              <Select value={selectedStage} onValueChange={handleUpdateStage}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue>
                    {currentStage && (
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${currentStage.color}`} />
                        {currentStage.name}
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                        {stage.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isAdminOrRop && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteLead}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                O'chirish
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Price Section - Prominent if sold */}
          <div className={`${isSoldStage ? 'p-4 bg-success/10 border-2 border-success rounded-lg' : ''}`}>
            <Label className={isSoldStage ? 'text-lg font-semibold' : ''}>
              Narx (so'm) {isSoldStage && <span className="text-destructive">*</span>}
            </Label>
            <div className="flex gap-2 mt-2">
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Kelishilgan summa"
                className={isSoldStage ? 'text-lg font-semibold' : ''}
                required={isSoldStage}
              />
              {price !== (lead?.price?.toString() || "") && (
                <Button onClick={handleUpdatePrice} size="sm">
                  Saqlash
                </Button>
              )}
            </div>
            {isSoldStage && !price && (
              <p className="text-sm text-destructive mt-1">Sotildi bosqichida narx kiritish majburiy</p>
            )}
          </div>

          {/* Product Selection - which product the seller is offering/selling, independent of stage */}
          <div>
            <Label className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Mahsulot
            </Label>
            <Select value={selectedProduct || undefined} onValueChange={handleUpdateProduct}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Mahsulotni tanlang" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.name}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lead Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{lead?.customer_phone || "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{sellerName(lead?.seller_id) || "—"}</span>
              </div>
              {lead?.activity && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>Faoliyat: {lead.activity}</span>
                </div>
              )}
              {lead?.lead_type && (
                <Badge variant="outline">{lead.lead_type}</Badge>
              )}
            </div>

            <div className="space-y-3">
              <div className="text-sm">
                <p className="text-muted-foreground mb-1">Yaratilgan sana</p>
                <p className="font-medium">{format(new Date(lead?.created_at), 'dd.MM.yyyy HH:mm')}</p>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground mb-1">Oxirgi yangilanish</p>
                <p className="font-medium">{format(new Date(lead?.updated_at), 'dd.MM.yyyy HH:mm')}</p>
              </div>
            </div>
          </div>

          {/* Meta (Facebook/Instagram) Ads Data */}
          {['facebook', 'instagram'].includes(lead?.source?.toLowerCase()) && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <Facebook className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">{lead?.source} Ads</h3>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Bu lid {lead?.source} reklamadan kelgan
              </p>
              {lead?.source && (
                <p className="text-xs text-muted-foreground mt-1">Manba: {lead.source}</p>
              )}
              {Array.isArray(lead?.facebook_form_answers) && lead.facebook_form_answers.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-blue-200 pt-3 dark:border-blue-800">
                  {lead.facebook_form_answers.map((item: { question: string; answer: string }, index: number) => (
                    <div key={index} className="text-sm">
                      <p className="text-blue-900/70 dark:text-blue-100/70">{item.question}</p>
                      <p className="font-medium text-blue-900 dark:text-blue-100">{item.answer}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Telegram Mini App order form data */}
          {lead?.source?.toLowerCase() === 'telegram' && (
            <div className="p-4 bg-sky-50 dark:bg-sky-950/20 rounded-lg border border-sky-200 dark:border-sky-800">
              <div className="flex items-center gap-2 mb-2">
                <Send className="h-5 w-5 text-sky-600" />
                <h3 className="font-semibold text-sky-900 dark:text-sky-100">Telegram buyurtma</h3>
              </div>
              <p className="text-sm text-sky-700 dark:text-sky-300">
                Bu lid Telegram bot orqali kelgan
              </p>
              {Array.isArray(lead?.telegram_form_answers) && lead.telegram_form_answers.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-sky-200 pt-3 dark:border-sky-800">
                  {lead.telegram_form_answers.map((item: { question: string; answer: string }, index: number) => (
                    <div key={index} className="text-sm">
                      <p className="text-sky-900/70 dark:text-sky-100/70">{item.question}</p>
                      <p className="font-medium text-sky-900 dark:text-sky-100">{item.answer}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Delivery Status - Only for Sotildi stage */}
          {isSoldStage && (
            <div className="p-4 bg-muted rounded-lg">
              <Label className="flex items-center gap-2 mb-2">
                <Truck className="h-4 w-4" />
                Yetkazish holati
              </Label>
              <Select value={deliveryStatus} onValueChange={handleUpdateDeliveryStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Holatni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {DELIVERY_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${option.color}`} />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Sold Products - Only for Sotildi stage */}
          {isSoldStage && (
            <div className="p-4 bg-muted rounded-lg">
              <Label className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4" />
                Sotilgan mahsulotlar
              </Label>

              {products.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {products.map((product) => (
                    <Button
                      key={product.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addProduct(product)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {product.name}
                    </Button>
                  ))}
                </div>
              )}

              {orderItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">Mahsulot tanlanmagan</p>
              ) : (
                <div className="space-y-2">
                  {orderItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="flex-1 truncate text-sm">{item.product_name}</span>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateProductQuantity(index, parseInt(e.target.value) || 1)}
                        className="w-20"
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeProduct(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {linkedOrder && (
                <Button size="sm" className="mt-3" onClick={handleSaveProducts}>
                  Saqlash
                </Button>
              )}
            </div>
          )}

          {/* Seller Selection (Admin/ROP only) */}
          {isAdminOrRop && (
            <div>
              <Label>Xodim</Label>
              <div className="flex gap-2 mt-1">
                <Select value={selectedSeller} onValueChange={setSelectedSeller}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sellers.map((seller) => (
                      <SelectItem key={seller.id} value={seller.id}>
                        {seller.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSeller !== lead.seller_id && (
                  <Button onClick={handleUpdateSeller} size="sm">
                    Saqlash
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label>Izoh</Label>
            <div className="flex gap-2 mt-1">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Izoh yozing..."
                rows={3}
                className="flex-1"
              />
              {notes !== (lead?.notes || "") && (
                <Button onClick={handleUpdateNotes} size="sm">
                  Saqlash
                </Button>
              )}
            </div>
          </div>

          {/* Tasks Section */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Vazifalar
              </h3>
              {!taskForm.showForm && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTaskForm({ ...taskForm, showForm: true })}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Vazifa qo'shish
                </Button>
              )}
            </div>

            {taskForm.showForm && (
              <div className="p-4 bg-muted rounded-lg mb-4 space-y-3">
                <div>
                  <Label>Vazifa nomi *</Label>
                  <Input
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    placeholder="Vazifa nomini kiriting"
                  />
                </div>
                <div>
                  <Label>Tavsif</Label>
                  <Textarea
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    placeholder="Vazifa tavsifini kiriting"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Muddat (Sana)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(taskForm.due_date, 'dd.MM.yyyy')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={taskForm.due_date}
                          onSelect={(date) => date && setTaskForm({ ...taskForm, due_date: date })}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>Vaqt</Label>
                    <Input
                      type="time"
                      value={taskForm.due_time}
                      onChange={(e) => setTaskForm({ ...taskForm, due_time: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTaskForm({ ...taskForm, showForm: false, title: "", description: "" })}
                  >
                    Bekor qilish
                  </Button>
                  <Button size="sm" onClick={handleAddTask}>
                    Saqlash
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Vazifalar yo'q
                </p>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 bg-card rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <button
                      onClick={() => handleToggleTask(task.id, task.status)}
                      className="mt-1"
                    >
                      <CheckCircle2
                        className={`h-5 w-5 ${
                          task.status === 'completed'
                            ? 'text-success'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </button>
                    <div className="flex-1">
                      <p className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Muddat: {format(new Date(task.due_date), 'dd.MM.yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Comments Section */}
          <div className="border-t pt-4">
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <MessageSquare className="h-5 w-5" />
              Izohlar
            </h3>

            <div className="space-y-3 mb-4">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Izohlar yo'q
                </p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium">{comment.profiles?.full_name || "Foydalanuvchi"}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(comment.created_at), 'dd.MM.yyyy HH:mm')}
                      </p>
                    </div>
                    <p className="text-sm">{comment.comment}</p>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
                placeholder="Izoh yozing... (Enter yuborish uchun)"
                rows={2}
                className="flex-1"
              />
              <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                Yuborish
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadDetailsDialog;
