import { Router } from "express";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import { requireAdminOrRop, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { recordActivity } from "../lib/activityLog.js";

const router = Router();
router.use(requireAuth, requireAdminOrRop);

// companyId and userId are nullable, and a plain DB unique index treats every
// NULL as distinct from every other NULL — so it can't catch duplicate
// role-wide targets when companyId is null (the common case here). Enforce
// "one target per role/employee/metric/period" explicitly instead.
const findDuplicateTarget = (companyId: string | null, role: string, userId: string | null, metricKey: string, period: string) =>
  db
    .select({ id: schema.kpiTargets.id })
    .from(schema.kpiTargets)
    .where(
      and(
        companyId ? eq(schema.kpiTargets.companyId, companyId) : isNull(schema.kpiTargets.companyId),
        eq(schema.kpiTargets.role, role as any),
        userId ? eq(schema.kpiTargets.userId, userId) : isNull(schema.kpiTargets.userId),
        eq(schema.kpiTargets.metricKey, metricKey),
        eq(schema.kpiTargets.period, period),
      ),
    )
    .limit(1);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const base = db.select().from(schema.kpiTargets);
    const rows = user.companyId ? await base.where(eq(schema.kpiTargets.companyId, user.companyId)) : await base;
    res.json(rows);
  }),
);

const kpiTargetSchema = z.object({
  role: z.enum(["admin", "rop", "sotuvchi", "super_admin"]),
  userId: z.string().uuid().nullable().optional(),
  metricKey: z.enum(["revenue", "average_check", "conversion_rate", "task_completion", "orders_count"]),
  targetValue: z.number(),
  weight: z.number().min(1).max(100).optional(),
  period: z.enum(["weekly", "monthly", "quarterly"]).optional(),
  isActive: z.boolean().optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const parsed = kpiTargetSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Noto'g'ri ma'lumot", details: parsed.error.flatten() });

    const { targetValue, ...rest } = parsed.data;
    const period = rest.period ?? "monthly";
    const userId = rest.userId ?? null;

    const [duplicate] = await findDuplicateTarget(user.companyId, rest.role, userId, rest.metricKey, period);
    if (duplicate) {
      return res.status(409).json({ error: "Bu lavozim/xodim va natija uchun reja allaqachon mavjud. Uni tahrirlang." });
    }

    const [row] = await db
      .insert(schema.kpiTargets)
      .values({ ...rest, targetValue: String(targetValue), companyId: user.companyId })
      .returning();

    recordActivity({
      companyId: user.companyId,
      actorId: user.id,
      subjectUserId: null,
      entityType: "kpi_target",
      entityId: row.id,
      action: "created",
      metadata: { role: row.role, metricKey: row.metricKey, targetValue: row.targetValue },
    });

    res.status(201).json(row);
  }),
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const [existing] = await db.select().from(schema.kpiTargets).where(eq(schema.kpiTargets.id, req.params.id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Topilmadi" });

    const parsed = kpiTargetSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Noto'g'ri ma'lumot" });

    const { targetValue, ...rest } = parsed.data;
    const [row] = await db
      .update(schema.kpiTargets)
      .set({ ...rest, ...(targetValue !== undefined ? { targetValue: String(targetValue) } : {}), updatedAt: new Date() })
      .where(eq(schema.kpiTargets.id, req.params.id))
      .returning();

    recordActivity({
      companyId: user.companyId,
      actorId: user.id,
      subjectUserId: null,
      entityType: "kpi_target",
      entityId: row.id,
      action: "updated",
      metadata: { role: row.role, metricKey: row.metricKey, targetValue: row.targetValue },
    });

    res.json(row);
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    await db.delete(schema.kpiTargets).where(eq(schema.kpiTargets.id, req.params.id));

    recordActivity({
      companyId: user.companyId,
      actorId: user.id,
      subjectUserId: null,
      entityType: "kpi_target",
      entityId: req.params.id,
      action: "deleted",
    });

    res.status(204).end();
  }),
);

export default router;
