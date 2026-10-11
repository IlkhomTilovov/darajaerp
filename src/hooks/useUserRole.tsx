import { useAuth } from "@/hooks/useAuth";

export const useUserRole = () => {
  const { user, loading } = useAuth();
  const roles = user?.roles ?? [];

  const isAdmin = roles.includes("admin");
  const isRop = roles.includes("rop");
  const isSotuvchi = roles.includes("sotuvchi");

  return { isAdmin, isRop, isSotuvchi, loading, canManage: isAdmin || isRop };
};
