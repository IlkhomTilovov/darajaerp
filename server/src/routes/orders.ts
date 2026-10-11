import { Router } from "express";
import { desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import { isAdminOrRop, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { recordActivity } from "../lib/activityLog.js";

const router = Router();
router.use(requireAuth);

// Drizzle's `numeric` columns come back from the DB as strings (to avoid
// float precision loss), but the API's JSON contract and the orders zod
// schema both expect JS numbers. Coerce on every response so callers never
// see a numeric-looking string here.
const toNum = (v: unknown) => (v === null || v === undefined ? v : Number(v));
const serializeOrder = <T extends { totalAmount: unknown; advancePayment: unknown }>(order: T, items: { price: unknown }[] = []) => ({
  ...order,
  totalAmount: toNum(order.totalAmount),
  advancePayment: toNum(order.advancePayment),
  orderItems: items.map((i) => ({ ...i, price: toNum(i.price) })),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const base = db.select().from(schema.orders).orderBy(desc(schema.orders.createdAt));
    const rows = isAdminOrRop(user)
      ? user.companyId
        ? await base.where(eq(schema.orders.companyId, user.companyId))
        : await base
      : await base.where(eq(schema.orders.sellerId, user.id));

    const items = rows.length
      ? await db.select().from(schema.orderItems).where(inArray(schema.orderItems.orderId, rows.map((o) => o.id)))
      : [];
    const itemsByOrder = new Map<string, typeof items>();
    for (const item of items) {
      const list = itemsByOrder.get(item.orderId) ?? [];
      list.push(item);
      itemsByOrder.set(item.orderId, list);
    }

    res.json(rows.map((o) => serializeOrder(o, itemsByOrder.get(o.id) ?? [])));
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, req.params.id)).limit(1);
    if (!order) return res.status(404).json({ error: "Topilmadi" });
    if (!isAdminOrRop(user) && order.sellerId !== user.id) return res.status(403).json({ error: "Ruxsat yo'q" });

    const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id));
    res.json(serializeOrder(order, items));
  }),
);

const orderItemSchema = z.object({
  productName: z.string().min(1),
  quantity: z.number().min(1),
  price: z.number(),
});

const orderSchema = z.object({
  sellerId: z.string().uuid(),
  customerName: z.string().min(1),
  customerPhone: z.string().optional(),
  customerPhone2: z.string().optional(),
  region: z.string().optional(),
  district: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().optional(),
  orderDate: z.string().optional(),
  advancePayment: z.number().optional(),
  totalAmount: z.number(),
  items: z.array(orderItemSchema).default([]),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const parsed = orderSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Noto'g'ri ma'lumot", details: parsed.error.flatten() });
    const { items, totalAmount, advancePayment, ...rest } = parsed.data;

    const result = await db.transaction(async (tx) => {
      const [order] = await tx
        .insert(schema.orders)
        .values({
          ...rest,
          totalAmount: String(totalAmount),
          advancePayment: advancePayment !== undefined ? String(advancePayment) : undefined,
          companyId: user.companyId,
        })
        .returning();

      const insertedItems =
        items.length > 0
          ? await tx
              .insert(schema.orderItems)
              .values(
                items.map((item) => ({
                  orderId: order.id,
                  productName: item.productName,
                  quantity: item.quantity,
                  price: String(item.price),
                })),
              )
              .returning()
          : [];

      return { order, insertedItems };
    });

    res.status(201).json(serializeOrder(result.order, result.insertedItems));
  }),
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const [existing] = await db.select().from(schema.orders).where(eq(schema.orders.id, req.params.id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Topilmadi" });
    if (!isAdminOrRop(user) && existing.sellerId !== user.id) return res.status(403).json({ error: "Ruxsat yo'q" });

    const parsed = orderSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Noto'g'ri ma'lumot" });
    const { items, totalAmount, advancePayment, ...rest } = parsed.data;

    const { order: row, resultItems } = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(schema.orders)
        .set({
          ...rest,
          ...(totalAmount !== undefined ? { totalAmount: String(totalAmount) } : {}),
          ...(advancePayment !== undefined ? { advancePayment: String(advancePayment) } : {}),
          ...(rest.status === "delivered" && !existing.deliveredAt ? { deliveredAt: new Date() } : {}),
          updatedAt: new Date(),
        })
        .where(eq(schema.orders.id, req.params.id))
        .returning();

      let resultItems = items
        ? []
        : await tx.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, req.params.id));

      if (items) {
        await tx.delete(schema.orderItems).where(eq(schema.orderItems.orderId, req.params.id));
        if (items.length > 0) {
          resultItems = await tx
            .insert(schema.orderItems)
            .values(
              items.map((item) => ({
                orderId: req.params.id,
                productName: item.productName,
                quantity: item.quantity,
                price: String(item.price),
              })),
            )
            .returning();
        }
      }

      return { order: updated, resultItems };
    });

    if (rest.status && rest.status !== existing.status) {
      recordActivity({
        companyId: existing.companyId,
        actorId: user.id,
        subjectUserId: existing.sellerId,
        entityType: "order",
        entityId: existing.id,
        action: "status_changed",
        metadata: { from: existing.status, to: rest.status },
      });
    }

    res.json(serializeOrder(row, resultItems));
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!isAdminOrRop(req.user)) return res.status(403).json({ error: "Ruxsat yo'q" });
    await db.delete(schema.orders).where(eq(schema.orders.id, req.params.id));
    res.status(204).end();
  }),
);

export default router;
