import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import { comparePassword, hashPassword, signToken } from "../lib/auth.js";
import { loadAuthUser, requireAuth } from "../middleware/auth.js";

const router = Router();

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(1),
});

router.post("/signup", async (req, res) => {
  const parsed = signUpSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Noto'g'ri ma'lumot", details: parsed.error.flatten() });
  }
  const { email, password, fullName } = parsed.data;

  const existing = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (existing.length > 0) {
    return res.status(409).json({ error: "Bu email bilan foydalanuvchi allaqachon mavjud" });
  }

  const passwordHash = await hashPassword(password);

  const user = await db.transaction(async (tx) => {
    const [newUser] = await tx.insert(schema.users).values({ email, passwordHash }).returning();
    await tx.insert(schema.profiles).values({ id: newUser.id, fullName, role: "seller" });
    await tx.insert(schema.userRoles).values({ userId: newUser.id, role: "sotuvchi" });
    return newUser;
  });

  const token = signToken(user.id);
  const authUser = await loadAuthUser(user.id);
  res.status(201).json({ token, user: authUser });
});

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/signin", async (req, res) => {
  const parsed = signInSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Noto'g'ri ma'lumot" });
  }
  const { email, password } = parsed.data;

  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (!user) {
    return res.status(401).json({ error: "Email yoki parol noto'g'ri" });
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Email yoki parol noto'g'ri" });
  }

  const token = signToken(user.id);
  const authUser = await loadAuthUser(user.id);
  res.json({ token, user: authUser });
});

router.get("/me", requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

export default router;
