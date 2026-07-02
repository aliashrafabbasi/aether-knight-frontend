import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/context/ToastContext";
import { useEffect } from "react";

export function AdminRoute() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const location = useLocation();
  const { showToast } = useToast();

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (token && user && !isAdmin) {
      showToast("Admin access required", "error");
    }
  }, [token, user, isAdmin, showToast]);

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!isAdmin) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}
