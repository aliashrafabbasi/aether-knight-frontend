import { useToast } from "@/context/ToastContext";
import type { ToastType } from "@/context/ToastContext";

const styles: Record<ToastType, string> = {
  success: "border-emerald-500/50 bg-emerald-950/90 text-emerald-100",
  error: "border-red-500/50 bg-red-950/90 text-red-100",
  info: "border-sky-500/50 bg-slate-900/95 text-sky-100",
};

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur ${styles[toast.type]}`}
          role="status"
        >
          <div className="flex items-start justify-between gap-3">
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="text-white/60 hover:text-white"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
