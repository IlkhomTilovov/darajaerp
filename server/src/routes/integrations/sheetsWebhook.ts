import { Router, type RequestHandler } from "express";
import { desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "../../db/index.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { appendToSheet } from "../../lib/googleSheets.js";

const router = Router();

// Optional shared-secret guard for endpoints called by external services (Google Apps Script).
// Set INTEGRATIONS_WEBHOOK_SECRET in server/.env to require it; leave empty to allow open access (dev default).
const requireWebhookSecret: RequestHandler = (req, res, next) => {
  const secret = process.env.INTEGRATIONS_WEBHOOK_SECRET;
  if (!secret) return next();
  if (req.header("x-webhook-secret") === secret || req.query.secret === secret) return next();
  return res.status(401).json({ success: false, error: "Invalid webhook secret" });
};

router.use(requireWebhookSecret);

// GET /api/integrations/sheets/sync?type=orders|leads&since=ISO&limit=1000
router.get(
  "/sync",
  asyncHandler(async (req, res) => {
    const type = (req.query.type as string) || "orders";
    const since = req.query.since as string | undefined;
    const limit = parseInt((req.query.limit as string) || "1000", 10);

    if (type === "orders") {
      let rows = await db.select().from(schema.orders).orderBy(desc(schema.orders.createdAt)).limit(limit);
      if (since) rows = rows.filter((o) => o.updatedAt >= new Date(since));

      const orderIds = rows.map((o) => o.id);
      const items = orderIds.length ? await db.select().from(schema.orderItems).where(inArray(schema.orderItems.orderId, orderIds)) : [];
      const sellerIds = [...new Set(rows.map((o) => o.sellerId))];
      const sellers = sellerIds.length ? await db.select().from(schema.profiles).where(inArray(schema.profiles.id, sellerIds)) : [];
      const nameById = new Map(sellers.map((s) => [s.id, s.fullName]));

      const formatted = rows.map((order) => {
        const orderItemsList = items.filter((i) => i.orderId === order.id);
        const products = orderItemsList.map((i) => `${i.productName} (${i.quantity}x${Number(i.price).toLocaleString()})`).join(", ");
        const remainingPayment = Number(order.totalAmount || 0) - Number(order.advancePayment || 0);

        return {
          id: order.id,
          order_number: order.orderNumber,
          customer_name: order.customerName,
          customer_phone: order.customerPhone || "",
          customer_phone2: order.customerPhone2 || "",
          address: `${order.region || ""}, ${order.district || ""}`.replace(/^, |, $/, ""),
          products,
          total_amount: Number(order.totalAmount) || 0,
          advance_payment: Number(order.advancePayment) || 0,
          remaining_payment: remainingPayment,
          notes: order.notes || "",
          seller_name: nameById.get(order.sellerId) || "Noma'lum",
          status: order.status,
          created_at: order.createdAt,
          updated_at: order.updatedAt,
        };
      });

      return res.json({ success: true, type: "orders", count: formatted.length, data: formatted });
    }

    if (type === "leads") {
      let rows = await db.select().from(schema.leads).orderBy(desc(schema.leads.createdAt)).limit(limit);
      if (since) rows = rows.filter((l) => l.updatedAt >= new Date(since));

      const sellerIds = [...new Set(rows.map((l) => l.sellerId))];
      const sellers = sellerIds.length ? await db.select().from(schema.profiles).where(inArray(schema.profiles.id, sellerIds)) : [];
      const nameById = new Map(sellers.map((s) => [s.id, s.fullName]));
      const stages = await db.select().from(schema.stages);
      const stageNameById = new Map(stages.map((s) => [s.id, s.name]));

      const formatted = rows.map((lead) => ({
        id: lead.id,
        customer_name: lead.customerName,
        customer_phone: lead.customerPhone || "",
        customer_email: lead.customerEmail || "",
        lead_type: lead.leadType || "",
        source: lead.source || "",
        stage_name: (lead.stage && stageNameById.get(lead.stage)) || "",
        status: lead.status,
        notes: lead.notes || "",
        activity: lead.activity || "",
        action_status: lead.actionStatus || "",
        delivery_status: lead.deliveryStatus || "",
        price: Number(lead.price) || 0,
        seller_name: nameById.get(lead.sellerId) || "Belgilanmagan",
        created_at: lead.createdAt,
        updated_at: lead.updatedAt,
      }));

      return res.json({ success: true, type: "leads", count: formatted.length, data: formatted });
    }

    res.status(400).json({ success: false, error: 'Invalid type. Use "orders" or "leads"' });
  }),
);

// POST /api/integrations/sheets/import-lead  (called by a Google Sheets Apps Script)
router.post(
  "/import-lead",
  asyncHandler(async (req, res) => {
    const body = req.body;

    const customerName = body.customer_name || body["Mijoz ismi"] || body["Mijoz ismi *"] || body["Customer Name"] || body.name;
    if (!customerName) {
      return res.status(400).json({ success: false, error: "Customer name is required" });
    }

    let sellerId: string | undefined = body.seller_id || body["Seller ID"];
    if (!sellerId) {
      const [admin] = await db
        .select({ userId: schema.userRoles.userId })
        .from(schema.userRoles)
        .where(inArray(schema.userRoles.role, ["admin", "rop"]))
        .limit(1);
      if (!admin) return res.status(400).json({ success: false, error: "No admin or ROP users found to assign the lead" });
      sellerId = admin.userId;
    }

    // "Muhim" stage is looked up by name since its id is environment-specific.
    const [importantStage] = await db.select().from(schema.stages).where(eq(schema.stages.name, "Muhim")).limit(1);

    const priceRaw = body.price || body["Price"];

    const [newLead] = await db
      .insert(schema.leads)
      .values({
        sellerId,
        customerName,
        customerPhone: body.customer_phone || body["Telefon raqami"] || body["Telefon raqami *"] || body["Customer Phone"] || body.phone,
        customerEmail: body.customer_email || body["Customer Email"] || body.email,
        leadType: body.lead_type || body["Lead Type"] || "Yangi lid",
        activity: body.activity || body["Faoliyat turi"] || body["Activity"] || null,
        source: body.source || body["Source"] || "Google Sheets",
        notes: body.notes || body["Notes"] || "",
        price: priceRaw !== undefined ? String(parseFloat(priceRaw)) : undefined,
        leadQuality: body.lead_quality || body["Lead Quality"] || "Lid sifati",
        stage: importantStage?.id,
      })
      .returning();

    res.json({ success: true, message: "Lead imported successfully", lead: newLead });
  }),
);

// POST /api/integrations/sheets/push  { type: 'order' | 'lead', data }
router.post(
  "/push",
  asyncHandler(async (req, res) => {
    const { type, data } = req.body as { type: string; data: Record<string, any> };
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    if (!spreadsheetId) {
      return res.status(400).json({ success: false, error: "Google Sheets not configured" });
    }

    if (type === "order") {
      const order = data;
      const products = (order.items || [])
        .map((item: any) => `${item.product_name} (${item.quantity}x${item.price?.toLocaleString() || 0})`)
        .join(", ");
      const remainingPayment = (order.total_amount || 0) - (order.advance_payment || 0);
      const address = `${order.region || ""}, ${order.district || ""}`.replace(/^, |, $/, "");

      const row = [
        order.id,
        order.order_number,
        order.customer_name,
        order.customer_phone || "",
        order.customer_phone2 || "",
        address,
        products,
        order.total_amount || 0,
        order.advance_payment || 0,
        remainingPayment,
        order.notes || "",
        order.seller_name || "",
        order.status,
        new Date(order.created_at || new Date()).toLocaleString("uz-UZ"),
      ];
      await appendToSheet(spreadsheetId, "Zakazlar!A:N", [row]);
    } else if (type === "lead") {
      const lead = data;
      const row = [
        lead.id,
        lead.customer_name,
        lead.customer_phone || "",
        lead.customer_email || "",
        lead.lead_type || "",
        lead.source || "",
        lead.stage_name || "",
        lead.status,
        lead.notes || "",
        lead.activity || "",
        lead.action_status || "",
        lead.delivery_status || "",
        lead.price || 0,
        lead.seller_name || "",
        new Date(lead.created_at || new Date()).toLocaleString("uz-UZ"),
      ];
      await appendToSheet(spreadsheetId, "Lidlar!A:O", [row]);
    }

    res.json({ success: true });
  }),
);

export default router;
