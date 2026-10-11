import { useAuth } from "@/hooks/useAuth";

export type AppRole = "admin" | "rop" | "sotuvchi" | "super_admin";

export const useUserRoles = () => {
  const { user, loading, refetch } = useAuth();
  const roles = (user?.roles ?? []) as AppRole[];

  const hasRole = (role: AppRole) => roles.includes(role);
  const isAdmin = hasRole("admin");
  const isRop = hasRole("rop");
  const isSotuvchi = hasRole("sotuvchi");
  const isAdminOrRop = isAdmin || isRop;

  return {
    roles,
    loading,
    hasRole,
    isAdmin,
    isRop,
    isSotuvchi,
    isAdminOrRop,
    refetch,
  };
};
