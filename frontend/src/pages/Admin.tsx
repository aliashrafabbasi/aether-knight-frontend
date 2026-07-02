import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteUser, listUsers, updateUser } from "@/api/admin";
import { AdminBackground } from "@/components/AdminBackground";
import { Nav } from "@/components/Nav";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/context/ToastContext";
import { ApiError } from "@/api/client";
import type { User, UserRole } from "@/types/api";

interface EditFormState {
  name: string;
  email: string;
  role: UserRole;
  password: string;
}

export function Admin() {
  const currentUser = useAuthStore((s) => s.user);
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<EditFormState>({
    name: "",
    email: "",
    role: "user",
    password: "",
  });

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await listUsers();
      return res.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: string;
      payload: {
        name?: string;
        email?: string;
        role?: UserRole;
        password?: string;
      };
    }) => updateUser(userId, payload),
    onSuccess: () => {
      showToast("User updated", "success");
      setEditing(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: Error) => {
      showToast(
        err instanceof ApiError ? err.message : "Update failed",
        "error",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      showToast("User deleted", "success");
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: Error) => {
      showToast(
        err instanceof ApiError ? err.message : "Delete failed",
        "error",
      );
    },
  });

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        email: editing.email,
        role: editing.role,
        password: "",
      });
    }
  }, [editing]);

  const openEdit = (user: User) => setEditing(user);

  const handleUpdate = (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const payload: {
      name?: string;
      email?: string;
      role?: UserRole;
      password?: string;
    } = {
      name: form.name,
      email: form.email,
      role: form.role,
    };
    if (form.password.trim()) {
      payload.password = form.password;
    }
    updateMutation.mutate({ userId: editing.id, payload });
  };

  const handleDelete = (user: User) => {
    if (user.id === currentUser?.id) return;
    if (window.confirm(`Delete user ${user.email}?`)) {
      deleteMutation.mutate(user.id);
    }
  };

  return (
    <AdminBackground>
      <Nav variant="cyber" />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:py-10">
        <div className="rounded-2xl border border-cyan-500/15 bg-slate-950/35 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur-md sm:p-8">
          <h1 className="font-display text-2xl font-semibold text-cyan-300 sm:text-3xl">
            User Management
          </h1>
          <p className="mt-2 text-slate-400">
            {usersQuery.data?.total ?? 0} users registered
          </p>
        </div>

        {usersQuery.isLoading && (
          <p className="mt-6 text-slate-500">Loading users…</p>
        )}

        {usersQuery.isError && (
          <p className="mt-6 text-red-400">Failed to load users.</p>
        )}

        <div className="mt-6 overflow-x-auto rounded-xl border border-cyan-500/15 bg-slate-950/35 shadow-xl shadow-black/20 backdrop-blur-md">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-cyan-500/15 bg-cyan-950/20">
              <tr>
                <th className="px-4 py-3 font-medium text-cyan-200/80">Name</th>
                <th className="px-4 py-3 font-medium text-cyan-200/80">Email</th>
                <th className="px-4 py-3 font-medium text-cyan-200/80">Role</th>
                <th className="px-4 py-3 font-medium text-cyan-200/80">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {usersQuery.data?.users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-white/5 transition hover:bg-cyan-500/5 last:border-0"
                >
                  <td className="px-4 py-3 text-white">
                    {user.name}
                    {user.id === currentUser?.id && (
                      <span className="ml-2 text-xs text-cyan-400/60">(you)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{user.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.role === "admin"
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-cyan-500/10 text-cyan-300"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(user)}
                        className="rounded-lg bg-cyan-600/80 px-3 py-1.5 text-white shadow-md shadow-cyan-900/30 transition hover:bg-cyan-500"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(user)}
                        disabled={user.id === currentUser?.id}
                        className="rounded-lg border border-red-500/30 px-3 py-1.5 text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="page-modal-in w-full max-w-md rounded-2xl border border-cyan-500/20 bg-slate-950/90 p-6 shadow-2xl shadow-cyan-900/30 backdrop-blur-xl">
            <h2 className="font-display text-lg font-semibold text-cyan-300">
              Edit User
            </h2>
            <form onSubmit={handleUpdate} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm text-slate-400">Name</label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  required
                  className="w-full rounded-lg border border-cyan-500/20 bg-slate-950 px-3 py-2 text-white outline-none ring-cyan-500/40 focus:ring-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  required
                  className="w-full rounded-lg border border-cyan-500/20 bg-slate-950 px-3 py-2 text-white outline-none ring-cyan-500/40 focus:ring-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Role</label>
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      role: e.target.value as UserRole,
                    }))
                  }
                  className="w-full rounded-lg border border-cyan-500/20 bg-slate-950 px-3 py-2 text-white outline-none ring-cyan-500/40 focus:ring-2"
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">
                  New password (optional)
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  placeholder="Leave blank to keep current"
                  className="w-full rounded-lg border border-cyan-500/20 bg-slate-950 px-3 py-2 text-white outline-none ring-cyan-500/40 focus:ring-2"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-lg px-4 py-2 text-slate-400 transition hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="admin-glow-btn rounded-lg bg-gradient-to-r from-cyan-600 to-teal-600 px-4 py-2 text-white transition hover:brightness-110 disabled:opacity-50"
                >
                  {updateMutation.isPending ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminBackground>
  );
}
