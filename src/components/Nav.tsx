import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { logout as logoutApi } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/context/ToastContext";

interface NavProps {
  variant?: "default" | "jarvis" | "cosmic" | "cyber";
}

export function Nav({ variant = "default" }: NavProps) {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const logoutMutation = useMutation({
    mutationFn: logoutApi,
    onSettled: () => {
      clearAuth();
      navigate("/login");
    },
    onError: (err: Error) => {
      showToast(err.message || "Logout failed", "error");
      clearAuth();
      navigate("/login");
    },
  });

  const jarvis = variant === "jarvis";
  const cosmic = variant === "cosmic";
  const cyber = variant === "cyber";

  return (
    <header
      className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${
        jarvis
          ? "border-b border-cyan-500/20 bg-jarvis-bg/80 backdrop-blur"
          : cyber
            ? "border-b border-cyan-500/25 bg-slate-950/40 backdrop-blur-xl"
            : cosmic
              ? "border-b border-purple-500/20 bg-slate-950/40 backdrop-blur-xl"
              : "border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
      }`}
    >
      <div className="flex items-center gap-4">
        <Link
          to="/home"
          className={`font-display text-lg font-semibold tracking-widest ${
            jarvis
              ? "text-jarvis-cyan"
              : cyber
                ? "bg-gradient-to-r from-cyan-400 via-teal-300 to-amber-400 bg-clip-text text-transparent"
                : cosmic
                  ? "bg-gradient-to-r from-orange-400 via-fuchsia-400 to-purple-400 bg-clip-text text-transparent"
                  : "text-slate-900 dark:text-white"
          }`}
        >
          AETHER KNIGHT
        </Link>
        {user && (
          <span
            className={`hidden text-sm sm:inline ${
              jarvis || cosmic || cyber ? "text-slate-400" : "text-slate-500"
            }`}
          >
            {user.name}
          </span>
        )}
      </div>
      <nav className="flex items-center gap-2 text-sm">
        <Link
          to="/home"
          className={`rounded px-3 py-1.5 transition ${
            jarvis
              ? "text-slate-300 hover:bg-cyan-500/10 hover:text-jarvis-cyan"
              : cyber
                ? "text-slate-300 hover:bg-cyan-500/15 hover:text-cyan-300"
                : cosmic
                  ? "text-slate-300 hover:bg-purple-500/15 hover:text-fuchsia-300"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          Home
        </Link>
        {user?.role === "admin" && (
          <Link
            to="/admin"
            className={`rounded px-3 py-1.5 transition ${
              jarvis
                ? "text-slate-300 hover:bg-cyan-500/10 hover:text-jarvis-cyan"
                : cyber
                  ? "text-slate-300 hover:bg-amber-500/15 hover:text-amber-300"
                  : cosmic
                    ? "text-slate-300 hover:bg-purple-500/15 hover:text-fuchsia-300"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            Admin
          </Link>
        )}
        <button
          type="button"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className={`rounded px-3 py-1.5 transition disabled:opacity-50 ${
            jarvis || cosmic || cyber
              ? "border border-red-500/40 text-red-300 hover:bg-red-500/10"
              : "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
          }`}
        >
          {logoutMutation.isPending ? "…" : "Logout"}
        </button>
      </nav>
    </header>
  );
}
