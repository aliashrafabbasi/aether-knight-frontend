import { useEffect } from "react";
import { getMe } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";

export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    getMe()
      .then((res) => {
        if (cancelled) return;
        if (res.data) setUser(res.data);
      })
      .catch(() => {
        if (!cancelled) clearAuth();
      });

    return () => {
      cancelled = true;
    };
  }, [token, setUser, clearAuth]);

  return <>{children}</>;
}
