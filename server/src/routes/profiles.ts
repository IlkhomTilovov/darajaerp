import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import { isAdminOrRop, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../lib/asyncHandler.js";

const router = Router();
router.use(requireAuth);

// List profiles: admin/rop see everyone in their company, others see only themselves
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const rows = isAdminOrRop(user)
      ? await db.select().from(schema.profiles).where(user.companyId ? eq(schema.profiles.companyId, user.companyId) : undefined)
      : await db.select().from(schema.profiles).where(eq(schema.profiles.id, user.id));
    res.json(rows);
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    if (req.params.id !== user.id && !isAdminOrRop(user)) {
      return res.status(403).json({ error: "Ruxsat yo'q" });
    }
    const [row] = await db.select().from(schema.profiles).where(eq(schema.profiles.id, req.params.id)).limit(1);
    if (!row) return res.status(404).json({ error: "Topilmadi" });
    res.json(row);
  }),
);

const updateSchema = z.object({
  fullName: z.string().min(1).optional(),
  phone: z.string().optional(),
  telegramUserId: z.string().optional(),
});

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    if (req.params.id !== user.id && !isAdminOrRop(user)) {
      return res.status(403).json({ error: "Ruxsat yo'q" });
    }
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Noto'g'ri ma'lumot" });

    const [row] = await db
      .update(schema.profiles)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(schema.profiles.id, req.params.id))
      .returning();
    if (!row) return res.status(404).json({ error: "Topilmadi" });
    res.json(row);
  }),
);

export default router;
