import type { ApiResponse } from "@/types/api";
import { useAuthStore } from "@/store/authStore";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function getAuthHeader(): Record<string, string> {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...getAuthHeader(),
    ...(options.headers as Record<string, string> | undefined),
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  let body: ApiResponse<T>;
  try {
    body = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError(
      response.ok ? "Invalid server response" : `Request failed (${response.status})`,
      response.status,
    );
  }

  if (!response.ok || body.success === false) {
    let detail = body.message;
    if (!detail) {
      const raw = body as { detail?: string | { msg: string }[] };
      if (typeof raw.detail === "string") detail = raw.detail;
      else if (Array.isArray(raw.detail) && raw.detail[0]?.msg) {
        detail = raw.detail[0].msg;
      }
    }
    throw new ApiError(detail ?? `Request failed (${response.status})`, response.status);
  }

  return body;
}

export function wsUrlForSession(sessionId: string): string {
  const base = API_URL.replace(/^http/, "ws");
  return `${base}/voice/live?session_id=${encodeURIComponent(sessionId)}`;
}
