import { useEffect, useId, useRef, type ReactNode } from "react";

export type ConfirmDialogVariant = "cosmic" | "cyber";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const variantStyles: Record<
  ConfirmDialogVariant,
  {
    border: string;
    shadow: string;
    iconBg: string;
    iconRing: string;
    title: string;
    confirm: string;
    cancel: string;
  }
> = {
  cosmic: {
    border: "border-fuchsia-500/25",
    shadow: "shadow-fuchsia-950/40",
    iconBg: "bg-fuchsia-500/15",
    iconRing: "ring-fuchsia-400/30",
    title: "text-fuchsia-100",
    confirm:
      "bg-gradient-to-r from-red-600 to-rose-600 shadow-lg shadow-red-950/40 hover:brightness-110",
    cancel:
      "border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10",
  },
  cyber: {
    border: "border-cyan-500/25",
    shadow: "shadow-cyan-950/40",
    iconBg: "bg-cyan-500/15",
    iconRing: "ring-cyan-400/30",
    title: "text-cyan-100",
    confirm:
      "bg-gradient-to-r from-red-600 to-rose-600 shadow-lg shadow-red-950/40 hover:brightness-110",
    cancel:
      "border border-cyan-500/20 bg-cyan-950/30 text-slate-200 hover:bg-cyan-950/50",
  },
};

function TrashIcon() {
  return (
    <svg
      className="h-6 w-6 text-red-300"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-9 0h10"
      />
    </svg>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  variant = "cosmic",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const styles = variantStyles[variant];

  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel();
      }}
    >
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
        aria-hidden
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={`page-modal-in relative w-full max-w-md rounded-2xl border bg-slate-950/95 p-6 shadow-2xl ${styles.border} ${styles.shadow} backdrop-blur-xl`}
      >
        <div className="flex gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 ${styles.iconBg} ${styles.iconRing}`}
          >
            <TrashIcon />
          </div>

          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              className={`font-display text-lg font-semibold ${styles.title}`}
            >
              {title}
            </h2>
            <div
              id={descId}
              className="mt-2 text-sm leading-relaxed text-slate-400"
            >
              {description}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={loading}
            className={`rounded-xl px-5 py-2.5 text-sm font-medium transition disabled:opacity-50 ${styles.cancel}`}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 ${styles.confirm}`}
          >
            {loading ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
