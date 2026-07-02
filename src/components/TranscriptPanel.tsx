import { useEffect, useRef, useState } from "react";
import type { TranscriptEntry } from "@/types/api";

interface TranscriptPanelProps {
  entries: TranscriptEntry[];
  className?: string;
}

const roleStyles: Record<TranscriptEntry["role"], string> = {
  user: "text-cyan-400",
  ai: "text-amber-300",
  sys: "text-slate-500",
};

const rolePrefix: Record<TranscriptEntry["role"], string> = {
  user: "You",
  ai: "AI",
  sys: "•",
};

export function TranscriptPanel({ entries, className = "" }: TranscriptPanelProps) {
  const [open, setOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const conversationEntries = entries.filter((e) => e.role !== "sys");
  const count = conversationEntries.length;

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [entries, open]);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group flex w-full items-center justify-between rounded-lg border border-cyan-500/20 bg-black/30 px-4 py-2.5 text-left transition hover:border-cyan-500/40 hover:bg-cyan-500/5"
      >
        <span className="font-display text-xs uppercase tracking-[0.2em] text-cyan-500/80 group-hover:text-cyan-400">
          {open ? "Hide transcript" : "View transcript"}
        </span>
        <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-300/70">
          {count} {count === 1 ? "message" : "messages"}
        </span>
      </button>

      <div
        className={`grid transition-all duration-300 ease-out ${
          open ? "mt-2 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="flex max-h-64 flex-col overflow-hidden rounded-lg border border-cyan-500/20 bg-black/40 backdrop-blur sm:max-h-80">
            <div className="flex-1 overflow-y-auto px-4 py-3 font-body text-sm leading-relaxed">
              {conversationEntries.length === 0 ? (
                <p className="text-slate-600">No messages yet…</p>
              ) : (
                conversationEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`mb-3 last:mb-0 ${roleStyles[entry.role]}`}
                  >
                    <span className="mr-2 text-xs uppercase tracking-wider opacity-50">
                      {rolePrefix[entry.role]}
                    </span>
                    {entry.text}
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
