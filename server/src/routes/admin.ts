import { Router } from "express";
import { desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import { hashPassword } from "../lib/auth.js";
import { requireAdminOrRop, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { recordActivity } from "../lib/activityLog.js";

const router = Router();
router.use(requireAuth, requireAdminOrRop);

// Combined profile + roles listing, used by the Sellers page
router.get(
  "/users",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const profileRows = user.companyId
      ? await db.select().from(schema.profiles).where(eq(schema.profiles.companyId, user.companyId)).orderBy(desc(schema.profiles.createdAt))
      : await db.select().from(schema.profiles).orderBy(desc(schema.profiles.createdAt));

    if (profileRows.length === 0) return res.json([]);

    const roleRows = await db
      .select()
      .from(schema.userRoles)
      .where(inArray(schema.userRoles.userId, profileRows.map((p) => p.id)));

    const rolesByUser = new Map<string, string[]>();
    for (const r of roleRows) {
      const list = rolesByUser.get(r.userId) ?? [];
      list.push(r.role);
      rolesByUser.set(r.userId, list);
    }

    res.json(profileRows.map((p) => ({ ...p, roles: rolesByUser.get(p.id) ?? [] })));
  }),
);

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(1),
  phone: z.string().optional(),
  role: z.enum(["admin", "rop", "sotuvchi"]),
});

router.post(
  "/users",
  asyncHandler(async (req, res) => {
    const creator = req.user!;
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Noto'g'ri ma'lumot", details: parsed.error.flatten() });
    const { email, password, fullName, phone, role } = parsed.data;

    const existing = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email)).limit(1);
    if (existing.length > 0) {
      return res.status(409).json({ error: "Bu email bilan foydalanuvchi allaqachon mavjud" });
    }

    const passwordHash = await hashPassword(password);

    const created = await db.transaction(async (tx) => {
      const [newUser] = await tx.insert(schema.users).values({ email, passwordHash }).returning();
      await tx.insert(schema.profiles).values({
        id: newUser.id,
        fullName,
        phone,
        companyId: creator.companyId,
        role: role === "admin" ? "admin" : "seller",
      });
      await tx.insert(schema.userRoles).values({ userId: newUser.id, role, companyId: creator.companyId });
      return newUser;
    });

    recordActivity({
      companyId: creator.companyId,
      actorId: creator.id,
      subjectUserId: created.id,
      entityType: "user",
      entityId: created.id,
      action: "created",
      metadata: { role, fullName },
    });

    res.status(201).json({ success: true, user: { id: created.id, email: created.email } });
  }),
);

router.delete(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const actor = req.user!;
    await db.delete(schema.users).where(eq(schema.users.id, req.params.id));

    recordActivity({
      companyId: actor.companyId,
      actorId: actor.id,
      subjectUserId: req.params.id,
      entityType: "user",
      entityId: req.params.id,
      action: "deleted",
    });

    res.json({ success: true });
  }),
);

export default router;
