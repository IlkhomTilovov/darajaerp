import { Router } from "express";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import { isAdminOrRop, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../lib/asyncHandler.js";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const rows = user.companyId
      ? await db.select().from(schema.deliveryStatuses).where(eq(schema.deliveryStatuses.companyId, user.companyId)).orderBy(asc(schema.deliveryStatuses.displayOrder))
      : await db.select().from(schema.deliveryStatuses).orderBy(asc(schema.deliveryStatuses.displayOrder));
    res.json(rows);
  }),
);

const deliveryStatusSchema = z.object({
  name: z.string().min(1),
  displayOrder: z.number(),
  color: z.string().optional(),
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

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!isAdminOrRop(req.user)) return res.status(403).json({ error: "Ruxsat yo'q" });
    await db.delete(schema.deliveryStatuses).where(eq(schema.deliveryStatuses.id, req.params.id));
    res.status(204).end();
  }),
);

export default router;
