import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../lib/asyncHandler.js";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const rows = user.companyId
      ? await db.select().from(schema.products).where(eq(schema.products.companyId, user.companyId))
      : await db.select().from(schema.products);
    res.json(rows);
  }),
);

const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number(),
  imageUrl: z.string().optional(),
  category: z.string().optional(),
  stock: z.number().optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Noto'g'ri ma'lumot" });

    const [row] = await db
      .insert(schema.products)
      .values({ ...parsed.data, price: String(parsed.data.price), companyId: user.companyId })
      .returning();
    res.status(201).json(row);
  }),
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const parsed = productSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Noto'g'ri ma'lumot" });

    const { price, ...rest } = parsed.data;
    const [row] = await db
      .update(schema.products)
      .set({ ...rest, ...(price !== undefined ? { price: String(price) } : {}), updatedAt: new Date() })
      .where(eq(schema.products.id, req.params.id))
      .returning();
    if (!row) return res.status(404).json({ error: "Topilmadi" });
    res.json(row);
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await db.delete(schema.products).where(eq(schema.products.id, req.params.id));
    res.status(204).end();
  }),
);

export default router;
