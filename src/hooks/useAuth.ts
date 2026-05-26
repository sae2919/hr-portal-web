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

export const useLogin = () => {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  
  return useMutation({
    mutationFn: async (credentials: any) => {
      // FIXED: Removed duplicate prefix. Becomes -> /api/v1/login
      const res = await api.post("/v1/login", credentials);
      return parseResponse(res.data);
    },
    onSuccess: (data: any) => {
      const token = data?.token ?? data?.data?.token ?? null;
      const user = data?.user ?? data?.data?.user ?? null;
      
      if (!token || !user) return;
      
      setAuth(user, token);
      
      setTimeout(() => {
        const role = user.role ? user.role.toLowerCase() : "employee";
        
        if (role === "admin" || role === "superadmin") {
          router.push("/dashboard");
        } else {
          router.push("/workspace");
        }
      }, 200);
    },
  });
};

export const useLogout = () => {
  const router = useRouter();
  const { clearAuth } = useAuthStore();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => api.post("/v1/logout"),
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
    // FIXED: Corrected route address mapping prefix string
    queryFn: () => api.get("/v1/me").then((r) => r.data.user),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: (data: any) =>
      // FIXED: Corrected route address mapping prefix string
      api.post("/v1/forgot-password", data).then((r) => r.data),
  });
};

export const useResetPassword = () => {
  const router = useRouter();
  return useMutation({
    mutationFn: (data: any) =>
      // FIXED: Corrected route address mapping prefix string
      api.post("/v1/reset-password", data).then((r) => r.data),
    onSuccess: () => {
      router.push("/login?reset=success");
    },
  });
};