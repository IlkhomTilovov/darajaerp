import type { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { verifyToken } from "../lib/auth.js";

export type AppRole = "admin" | "rop" | "sotuvchi" | "super_admin";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  companyId: string | null;
  profileRole: "admin" | "seller";
  roles: AppRole[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const hasRole = (user: AuthUser | undefined, role: AppRole) => !!user?.roles.includes(role);
export const isAdminOrRop = (user: AuthUser | undefined) => hasRole(user, "admin") || hasRole(user, "rop");
export const isSuperAdmin = (user: AuthUser | undefined) => hasRole(user, "super_admin");

export const loadAuthUser = async (userId: string): Promise<AuthUser | null> => {
  const [row] = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      fullName: schema.profiles.fullName,
      companyId: schema.profiles.companyId,
      profileRole: schema.profiles.role,
    })
    .from(schema.users)
    .innerJoin(schema.profiles, eq(schema.profiles.id, schema.users.id))
    .where(eq(schema.users.id, userId))
    .limit(1);

  if (!row) return null;

  const roleRows = await db
    .select({ role: schema.userRoles.role })
    .from(schema.userRoles)
    .where(eq(schema.userRoles.userId, userId));

  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    companyId: row.companyId,
    profileRole: row.profileRole,
    roles: roleRows.map((r) => r.role),
  };
};

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: "Avtorizatsiyadan o'tilmagan" });
    }

    const payload = verifyToken(token);
    const user = await loadAuthUser(payload.sub);
    if (!user) {
      return res.status(401).json({ error: "Foydalanuvchi topilmadi" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token yaroqsiz yoki muddati o'tgan" });
  }
};

export const requireAdminOrRop = (req: Request, res: Response, next: NextFunction) => {
  if (!isAdminOrRop(req.user)) {
    return res.status(403).json({ error: "Ruxsat yo'q" });
  }
  next();
};
