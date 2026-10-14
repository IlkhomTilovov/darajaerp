import { Router } from "express";
import { eq } from "drizzle-orm";
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
      ? await db.select().from(schema.couriers).where(eq(schema.couriers.companyId, user.companyId))
      : await db.select().from(schema.couriers);
    res.json(rows);
  }),
);

const courierSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  region: z.string().optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    if (!isAdminOrRop(user)) return res.status(403).json({ error: "Ruxsat yo'q" });
    const parsed = courierSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Noto'g'ri ma'lumot" });

    const [row] = await db
      .insert(schema.couriers)
      .values({ ...parsed.data, companyId: user.companyId })
      .returning();
    res.status(201).json(row);
  }),
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!isAdminOrRop(req.user)) return res.status(403).json({ error: "Ruxsat yo'q" });
    const parsed = courierSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Noto'g'ri ma'lumot" });

    const [row] = await db
      .update(schema.couriers)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(schema.couriers.id, req.params.id))
      .returning();
    if (!row) return res.status(404).json({ error: "Topilmadi" });
    res.json(row);
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!isAdminOrRop(req.user)) return res.status(403).json({ error: "Ruxsat yo'q" });
    await db.delete(schema.couriers).where(eq(schema.couriers.id, req.params.id));
    res.status(204).end();
  }),
);

export default router;
