import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

const parseResponse = (data: any) => {
  if (typeof data === "string") {
    try {
      const match = data.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
    } catch (e) {}
  }
  return data;
};

// ─── Role resolution ──────────────────────────────────────────────────────────
// Priority: Spatie role (user.roles[]) > users.role column > designation title

const ADMIN_ROLES    = ['admin', 'super_admin', 'superadmin', 'hr_admin'];
const HR_ROLES       = ['hr', 'hr_manager'];
const MANAGER_ROLES  = ['manager'];
const SALES_MGR_ROLES = ['sales_manager'];

// Designation keywords that map to team_lead
const TEAM_LEAD_DESIGNATIONS = [
  'sales head', 'seo lead', 'tech lead', 'technical lead',
  'team lead', 'lead', 'head', 'seo head', 'dev lead',
];

// Designation keywords that map to manager
const MANAGER_DESIGNATIONS = [
  'manager', 'senior manager', 'department manager',
];

export const resolveRoleTier = (user: any): string => {
  if (!user) return 'employee';

  // 1. Check Spatie roles array first (most authoritative)
  const spatieRoles: string[] = (user.roles ?? []).map((r: string) =>
    r.toLowerCase().replace(/[\s-]/g, '_')
  );

  if (spatieRoles.some((r) => ADMIN_ROLES.includes(r)))    return 'admin';
  if (spatieRoles.some((r) => HR_ROLES.includes(r)))        return 'hr';
  if (spatieRoles.some((r) => MANAGER_ROLES.includes(r)))   return 'manager';
  if (spatieRoles.some((r) => SALES_MGR_ROLES.includes(r))) return 'sales_manager';
  if (spatieRoles.includes('team_lead'))                     return 'team_lead';

  // 2. Fallback: users.role column
  const roleCol = (user.role ?? '').toLowerCase().replace(/[\s-]/g, '_');
  if (ADMIN_ROLES.includes(roleCol))    return 'admin';
  if (HR_ROLES.includes(roleCol))       return 'hr';
  if (MANAGER_ROLES.includes(roleCol))  return 'manager';
  if (roleCol === 'sales_manager')      return 'sales_manager';
  if (roleCol === 'team_lead')          return 'team_lead';

  // 3. Fallback: designation title
  const designation = (user.employee?.designation ?? '').toLowerCase();
  if (MANAGER_DESIGNATIONS.some((d) => designation.includes(d))) return 'manager';
  if (TEAM_LEAD_DESIGNATIONS.some((d) => designation.includes(d))) return 'team_lead';

  return 'employee';
};

export const useLogin = () => {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: async (credentials: any) => {
      const res = await api.post("/login", credentials);
      return parseResponse(res.data);
    },
    onSuccess: (data: any) => {
      const token = data?.token ?? data?.data?.token ?? null;
      const user  = data?.user  ?? data?.data?.user  ?? null;

      if (!token || !user) return;

      setAuth(user, token);

      setTimeout(() => {
        const tier = resolveRoleTier(user);

        if (tier === 'admin' || tier === 'hr')           router.push('/dashboard');
        else if (tier === 'manager')                     router.push('/workspace');
        else if (tier === 'sales_manager')               router.push('/workspace');
        else if (tier === 'team_lead')                   router.push('/workspace');
        else                                             router.push('/workspace');
      }, 200);
    },
  });
};

export const useLogout = () => {
  const router = useRouter();
  const { clearAuth } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post("/logout"),
    onSettled: () => {
      clearAuth();
      queryClient.clear();
      router.push("/login");
    },
  });
};

export const useMe = () => {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ["me"],
    queryFn: () => api.get("/me").then((r) => r.data.user),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: (data: any) =>
      api.post("/forgot-password", data).then((r) => r.data),
  });
};

export const useResetPassword = () => {
  const router = useRouter();
  return useMutation({
    mutationFn: (data: any) =>
      api.post("/reset-password", data).then((r) => r.data),
    onSuccess: () => {
      router.push("/login?reset=success");
    },
  });
};