import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import { isAdminOrRop, requireAuth, type AuthUser } from "../middleware/auth.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { recordActivity } from "../lib/activityLog.js";

const router = Router();
router.use(requireAuth);

// Simple 5-stage Kanban: ready -> in_transit -> delivered / needs_followup / rejected.
// needs_followup can be re-attempted (back to in_transit) or finally rejected.
// delivered and rejected are terminal — this module intentionally has no
// redelivery/history-row pattern and no courier KPI scoring.
export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  ready: ["in_transit", "rejected"],
  in_transit: ["delivered", "needs_followup", "rejected"],
  needs_followup: ["in_transit", "rejected"],
  delivered: [],
  rejected: [],
};

export const STATUS_LABELS: Record<string, string> = {
  ready: "Yetkazishga tayyor",
  in_transit: "Yo'lda",
  delivered: "Yetkazildi",
  needs_followup: "Qayta bog'lanish kerak",
  rejected: "Rad etildi",
};

const REJECTION_REASONS = ["customer_rejected", "customer_changed_mind", "unreachable", "wrong_address", "time_mismatch", "other"] as const;

// Sellers only ever see deliveries for their own orders; admin/rop see the
// whole company's. There is no separate "courier" or "delivery manager" role
// in this module — status changes are gated by the existing admin/rop check.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const user: AuthUser = req.user!;
    const base = db
      .select({ delivery: schema.deliveries, sellerId: schema.orders.sellerId })
      .from(schema.deliveries)
      .innerJoin(schema.orders, eq(schema.orders.id, schema.deliveries.orderId))
      .orderBy(desc(schema.deliveries.updatedAt));

    const rows = isAdminOrRop(user)
      ? user.companyId
        ? await base.where(eq(schema.deliveries.companyId, user.companyId))
        : await base
      : await base.where(eq(schema.orders.sellerId, user.id));

    res.json(rows.map((r) => r.delivery));
  }),
);

router.get(
  "/:id/history",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const [delivery] = await db.select().from(schema.deliveries).where(eq(schema.deliveries.id, req.params.id)).limit(1);
    if (!delivery) return res.status(404).json({ error: "Topilmadi" });

    const [order] = await db.select({ sellerId: schema.orders.sellerId }).from(schema.orders).where(eq(schema.orders.id, delivery.orderId)).limit(1);
    if (!isAdminOrRop(user) && order?.sellerId !== user.id) return res.status(403).json({ error: "Ruxsat yo'q" });

    const history = await db
      .select()
      .from(schema.activityLog)
      .where(eq(schema.activityLog.entityId, delivery.id))
      .orderBy(desc(schema.activityLog.createdAt));
    res.json(history);
  }),
);

const updateSchema = z.object({
  status: z.enum(["ready", "in_transit", "delivered", "needs_followup", "rejected"]).optional(),
  courierName: z.string().nullable().optional(),
  courierPhone: z.string().nullable().optional(),
  deliveryFee: z.number().nullable().optional(),
  deliveryDate: z.string().nullable().optional(),
  rejectionReason: z.enum(REJECTION_REASONS).nullable().optional(),
  rejectionNote: z.string().nullable().optional(),
  followupReason: z.string().nullable().optional(),
  followupNote: z.string().nullable().optional(),
  followupDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// Upserts: an order implicitly starts "ready" the moment it exists, so there
// is no separate "mark as ready for delivery" step — the first status change
// (or any detail edit) lazily creates the delivery row.
router.patch(
  "/order/:orderId",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    if (!isAdminOrRop(user)) return res.status(403).json({ error: "Ruxsat yo'q" });

    const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, req.params.orderId)).limit(1);
    if (!order) return res.status(404).json({ error: "Buyurtma topilmadi" });

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Noto'g'ri ma'lumot", details: parsed.error.flatten() });
    const data = parsed.data;

    let [existing] = await db.select().from(schema.deliveries).where(eq(schema.deliveries.orderId, order.id)).limit(1);
    let created = false;
    if (!existing) {
      [existing] = await db.insert(schema.deliveries).values({ orderId: order.id, companyId: user.companyId, status: "ready" }).returning();
      created = true;
    }

    if (data.status && data.status !== existing.status) {
      const allowed = ALLOWED_TRANSITIONS[existing.status] ?? [];
      if (!allowed.includes(data.status)) {
        return res.status(400).json({
          error: `"${STATUS_LABELS[existing.status] ?? existing.status}" holatidan "${STATUS_LABELS[data.status] ?? data.status}"ga o'tib bo'lmaydi`,
        });
      }
      if (data.status === "rejected" && !(data.rejectionReason ?? existing.rejectionReason)) {
        return res.status(400).json({ error: "Rad etish sababi kiritilishi shart" });
      }
      if (data.status === "rejected" && (data.rejectionReason ?? existing.rejectionReason) === "other" && !(data.rejectionNote ?? existing.rejectionNote)) {
        return res.status(400).json({ error: "\"Boshqa sabab\" uchun izoh kiritilishi shart" });
      }
    }

    const { deliveryFee, ...rest } = data;
    const patchValues: Record<string, unknown> = {
      ...rest,
      updatedAt: new Date(),
      ...(deliveryFee !== undefined ? { deliveryFee: deliveryFee === null ? null : String(deliveryFee) } : {}),
    };

    const statusChanged = !!data.status && data.status !== existing.status;
    if (statusChanged) {
      patchValues.statusUpdatedBy = user.id;
      patchValues.statusUpdatedAt = new Date();
      if (data.status === "delivered") patchValues.deliveredAt = new Date();
    }

    const [updated] = await db.update(schema.deliveries).set(patchValues).where(eq(schema.deliveries.id, existing.id)).returning();

    // Keep the existing coarse orders.status in sync on terminal delivery
    // outcomes, so AllOrders' "Tugallandi/Bekor qilindi" tabs stay accurate
    // without duplicating delivery logic there.
    if (statusChanged && data.status === "delivered") {
      await db.update(schema.orders).set({ status: "delivered", deliveredAt: new Date(), updatedAt: new Date() }).where(eq(schema.orders.id, order.id));
    } else if (statusChanged && data.status === "rejected") {
      await db.update(schema.orders).set({ status: "cancelled", updatedAt: new Date() }).where(eq(schema.orders.id, order.id));
    }

    if (statusChanged) {
      recordActivity({
        companyId: user.companyId,
        actorId: user.id,
        subjectUserId: order.sellerId,
        entityType: "delivery",
        entityId: existing.id,
        action: "status_changed",
        metadata: {
          from: existing.status,
          to: data.status,
          reason: data.status === "rejected" ? data.rejectionReason ?? existing.rejectionReason : data.status === "needs_followup" ? data.followupReason : undefined,
          note: data.status === "rejected" ? data.rejectionNote ?? existing.rejectionNote : data.status === "needs_followup" ? data.followupNote : undefined,
        },
      });
    } else if (!created && Object.keys(data).length > 0) {
      recordActivity({
        companyId: user.companyId,
        actorId: user.id,
        subjectUserId: order.sellerId,
        entityType: "delivery",
        entityId: existing.id,
        action: "updated",
        metadata: { fields: Object.keys(data) },
      });
    }

    res.json(updated);
  }),
);

export default router;
