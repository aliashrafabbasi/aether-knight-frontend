import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { register } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/context/ToastContext";
import { AuthBackground } from "@/components/AuthBackground";
import { ApiError } from "@/api/client";

export function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const token = useAuthStore((s) => s.token);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: register,
    onSuccess: () => {
      showToast("Account created — please sign in", "success");
      navigate("/login");
    },
    onError: (err: Error) => {
      const msg =
        err instanceof ApiError ? err.message : "Registration failed.";
      showToast(msg, "error");
    },
  });

  if (token) {
    return <Navigate to="/home" replace />;
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate({ name, email, password, role: "user" });
  };

  return (
    <AuthBackground>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/75 p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <h1 className="font-display text-center text-2xl font-bold tracking-widest text-cyan-400">
          CREATE ACCOUNT
        </h1>
        <p className="mt-2 text-center text-sm text-slate-400">
          Join Aether Knight
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm text-slate-300">
              Name
            </label>
            <input
              id="name"
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none ring-cyan-500/50 focus:ring-2"
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-slate-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none ring-cyan-500/50 focus:ring-2"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm text-slate-300"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none ring-cyan-500/50 focus:ring-2"
            />
          </div>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full rounded-lg bg-cyan-600 py-2.5 font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-50"
          >
            {mutation.isPending ? "Creating…" : "Register"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link to="/login" className="text-cyan-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthBackground>
  );
}
