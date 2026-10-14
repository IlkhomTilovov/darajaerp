import { Router } from "express";
import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import { isAdminOrRop, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../lib/asyncHandler.js";

const router = Router();
router.use(requireAuth);

// Seed defaults for the 5 built-in pipeline columns, lazily created per
// company the first time this list is fetched. Colors are the closest match
// available in the admin color picker (see COLOR_OPTIONS in
// DeliveryStatusManagement.tsx) to the original hardcoded header colors.
const BUILT_IN_DEFAULTS: { builtInKey: string; name: string; color: string; displayOrder: number }[] = [
  { builtInKey: "ready", name: "Yetkazishga tayyor", color: "bg-indigo-500", displayOrder: 1 },
  { builtInKey: "in_transit", name: "Yo'lda", color: "bg-blue-500", displayOrder: 2 },
  { builtInKey: "delivered", name: "Yetkazildi", color: "bg-green-500", displayOrder: 3 },
  { builtInKey: "needs_followup", name: "Qayta bog'lanish kerak", color: "bg-yellow-500", displayOrder: 4 },
  { builtInKey: "rejected", name: "Rad etildi", color: "bg-red-500", displayOrder: 5 },
];

const ensureBuiltInRows = async (companyId: string | null) => {
  const companyFilter = companyId ? eq(schema.deliveryStatuses.companyId, companyId) : isNull(schema.deliveryStatuses.companyId);
  const existing = await db
    .select({ builtInKey: schema.deliveryStatuses.builtInKey })
    .from(schema.deliveryStatuses)
    .where(and(companyFilter, isNotNull(schema.deliveryStatuses.builtInKey)));
  const existingKeys = new Set(existing.map((r) => r.builtInKey).filter(Boolean));
  const missing = BUILT_IN_DEFAULTS.filter((d) => !existingKeys.has(d.builtInKey));
  if (missing.length > 0) {
    try {
      await db.insert(schema.deliveryStatuses).values(missing.map((d) => ({ ...d, companyId })));
    } catch {
      // A concurrent request already seeded these (unique constraint on
      // company+builtInKey) — nothing to do.
    }
  }
};

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    await ensureBuiltInRows(user.companyId);

    const companyFilter = user.companyId ? eq(schema.deliveryStatuses.companyId, user.companyId) : isNull(schema.deliveryStatuses.companyId);
    const rows = await db.select().from(schema.deliveryStatuses).where(companyFilter).orderBy(asc(schema.deliveryStatuses.displayOrder));
    res.json(rows);
  }),
);

const deliveryStatusSchema = z.object({
  name: z.string().min(1),
  displayOrder: z.number(),
  color: z.string().optional(),
  hidden: z.boolean().optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    if (!isAdminOrRop(user)) return res.status(403).json({ error: "Ruxsat yo'q" });
    const parsed = deliveryStatusSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Noto'g'ri ma'lumot" });

    const [row] = await db
      .insert(schema.deliveryStatuses)
      .values({ ...parsed.data, companyId: user.companyId })
      .returning();
    res.status(201).json(row);
  }),
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!isAdminOrRop(req.user)) return res.status(403).json({ error: "Ruxsat yo'q" });
    const parsed = deliveryStatusSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Noto'g'ri ma'lumot" });

    const [row] = await db
      .update(schema.deliveryStatuses)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(schema.deliveryStatuses.id, req.params.id))
      .returning();
    if (!row) return res.status(404).json({ error: "Topilmadi" });
    res.json(row);
  }),
);

// A built-in column's key drives pipeline business logic the app can't
// forget, so it's never actually removed from the table — deleting one just
// hides it, which is reversible from the management dialog. Custom columns
// have no such dependency and are genuinely deleted.
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!isAdminOrRop(req.user)) return res.status(403).json({ error: "Ruxsat yo'q" });

    const [existing] = await db.select().from(schema.deliveryStatuses).where(eq(schema.deliveryStatuses.id, req.params.id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Topilmadi" });

    if (existing.builtInKey) {
      await db.update(schema.deliveryStatuses).set({ hidden: true, updatedAt: new Date() }).where(eq(schema.deliveryStatuses.id, req.params.id));
    } else {
      await db.delete(schema.deliveryStatuses).where(eq(schema.deliveryStatuses.id, req.params.id));
    }
    res.status(204).end();
  }),
);

export default router;
