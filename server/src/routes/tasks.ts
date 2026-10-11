import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import { isAdminOrRop, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { recordActivity } from "../lib/activityLog.js";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const base = db.select().from(schema.tasks).orderBy(desc(schema.tasks.dueDate));
    const rows = isAdminOrRop(user)
      ? user.companyId
        ? await base.where(eq(schema.tasks.companyId, user.companyId))
        : await base
      : await base.where(eq(schema.tasks.sellerId, user.id));
    res.json(rows);
  }),
);

const taskSchema = z.object({
  sellerId: z.string().uuid(),
  leadId: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string(),
  status: z.string().optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const parsed = taskSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Noto'g'ri ma'lumot", details: parsed.error.flatten() });

    if (!isAdminOrRop(user) && parsed.data.sellerId !== user.id) {
      return res.status(403).json({ error: "Faqat o'zingizga vazifa yaratishingiz mumkin" });
    }

    const [row] = await db
      .insert(schema.tasks)
      .values({ ...parsed.data, dueDate: new Date(parsed.data.dueDate), companyId: user.companyId })
      .returning();
    res.status(201).json(row);
  }),
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const [existing] = await db.select().from(schema.tasks).where(eq(schema.tasks.id, req.params.id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Topilmadi" });
    if (!isAdminOrRop(user) && existing.sellerId !== user.id) return res.status(403).json({ error: "Ruxsat yo'q" });

    const parsed = taskSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Noto'g'ri ma'lumot" });
    const { dueDate, ...rest } = parsed.data;

    const [row] = await db
      .update(schema.tasks)
      .set({
        ...rest,
        ...(dueDate ? { dueDate: new Date(dueDate) } : {}),
        ...(rest.status === "completed" && !existing.completedAt ? { completedAt: new Date() } : {}),
        updatedAt: new Date(),
      })
      .where(eq(schema.tasks.id, req.params.id))
      .returning();

    if (rest.status === "completed" && existing.status !== "completed") {
      recordActivity({
        companyId: existing.companyId,
        actorId: user.id,
        subjectUserId: existing.sellerId,
        entityType: "task",
        entityId: existing.id,
        action: "completed",
        metadata: { title: existing.title },
      });
    }

    res.json(row);
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const [existing] = await db.select().from(schema.tasks).where(eq(schema.tasks.id, req.params.id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Topilmadi" });
    if (!isAdminOrRop(user) && existing.sellerId !== user.id) return res.status(403).json({ error: "Ruxsat yo'q" });

    await db.delete(schema.tasks).where(eq(schema.tasks.id, req.params.id));
    res.status(204).end();
  }),
);

export default router;
