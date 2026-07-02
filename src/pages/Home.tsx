import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  deleteSession,
  listSessions,
  resumeVoiceChat,
  startVoiceChat,
} from "@/api/voice";
import { HomeBackground } from "@/components/HomeBackground";
import { Nav } from "@/components/Nav";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/context/ToastContext";
import { ApiError } from "@/api/client";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function Home() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const sessionsQuery = useQuery({
    queryKey: ["voice-sessions"],
    queryFn: async () => {
      const res = await listSessions();
      return res.data ?? [];
    },
  });

  const startMutation = useMutation({
    mutationFn: startVoiceChat,
    onSuccess: (res) => {
      if (!res.data) return;
      navigate(`/voice/${res.data.session_id}`);
    },
    onError: (err: Error) => {
      showToast(
        err instanceof ApiError ? err.message : "Could not start chat",
        "error",
      );
    },
  });

  const resumeMutation = useMutation({
    mutationFn: (sessionId: string) => resumeVoiceChat(sessionId),
    onSuccess: (res) => {
      if (!res.data) return;
      navigate(`/voice/${res.data.session_id}`);
    },
    onError: (err: Error) => {
      showToast(
        err instanceof ApiError ? err.message : "Could not resume chat",
        "error",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSession,
    onSuccess: () => {
      showToast("Chat deleted", "success");
      void queryClient.invalidateQueries({ queryKey: ["voice-sessions"] });
    },
    onError: (err: Error) => {
      showToast(
        err instanceof ApiError ? err.message : "Could not delete chat",
        "error",
      );
    },
  });

  const handleDelete = (sessionId: string, title: string) => {
    if (window.confirm(`Delete "${title}"? This cannot be undone.`)) {
      deleteMutation.mutate(sessionId);
    }
  };

  return (
    <HomeBackground>
      <Nav variant="cosmic" />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:py-10">
        <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-6 shadow-2xl shadow-purple-950/20 backdrop-blur-md sm:p-8">
          <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
            Welcome, {user?.name ?? "Knight"}
          </h1>
          <p className="mt-2 text-slate-400">
            Start a new voice conversation or continue where you left off.
          </p>

          <button
            type="button"
            onClick={() => startMutation.mutate()}
            disabled={startMutation.isPending}
            className="home-glow-btn mt-8 w-full rounded-xl bg-gradient-to-r from-orange-500 via-fuchsia-600 to-purple-600 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-fuchsia-900/40 transition hover:brightness-110 disabled:opacity-50 sm:w-auto"
          >
            {startMutation.isPending ? "Starting…" : "+ New Voice Chat"}
          </button>
        </div>

        <section className="mt-8">
          <h2 className="font-display text-lg font-medium text-fuchsia-200/90">
            Saved Chats
          </h2>

          {sessionsQuery.isLoading && (
            <p className="mt-4 text-slate-500">Loading chats…</p>
          )}

          {sessionsQuery.isError && (
            <p className="mt-4 text-red-400">Failed to load chats.</p>
          )}

          {sessionsQuery.data?.length === 0 && !sessionsQuery.isLoading && (
            <p className="mt-4 rounded-xl border border-white/5 bg-slate-950/40 px-4 py-6 text-center text-slate-500 backdrop-blur-sm">
              No saved chats yet — start your first voice session above.
            </p>
          )}

          <ul className="mt-4 space-y-3">
            {sessionsQuery.data?.map((session) => (
              <li
                key={session.id}
                className="rounded-xl border border-white/10 bg-slate-950/35 p-4 shadow-lg shadow-black/20 backdrop-blur-md transition hover:border-fuchsia-500/25"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-white">
                      {session.title}
                    </h3>
                    {session.preview && (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                        {session.preview}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-slate-500">
                      {session.message_count} messages · Updated{" "}
                      {formatDate(session.updated_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => resumeMutation.mutate(session.id)}
                      disabled={
                        resumeMutation.isPending &&
                        resumeMutation.variables === session.id
                      }
                      className="rounded-lg bg-purple-600/80 px-4 py-2 text-sm font-medium text-white shadow-md shadow-purple-900/30 transition hover:bg-purple-500 disabled:opacity-50"
                    >
                      Resume
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(session.id, session.title)}
                      disabled={deleteMutation.isPending}
                      className="rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {user?.role === "admin" && (
          <p className="mt-8 text-sm text-slate-500">
            Admin?{" "}
            <Link
              to="/admin"
              className="text-fuchsia-400 transition hover:text-fuchsia-300 hover:underline"
            >
              Manage users
            </Link>
          </p>
        )}
      </main>
    </HomeBackground>
  );
}
