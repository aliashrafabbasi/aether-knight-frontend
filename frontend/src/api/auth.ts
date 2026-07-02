import { apiRequest } from "@/api/client";
import type {
  ApiResponse,
  AuthToken,
  LoginRequest,
  RegisterRequest,
  User,
} from "@/types/api";

export async function login(
  payload: LoginRequest,
): Promise<ApiResponse<AuthToken>> {
  return apiRequest<AuthToken>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function register(
  payload: RegisterRequest,
): Promise<ApiResponse<User>> {
  return apiRequest<User>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMe(): Promise<ApiResponse<User>> {
  return apiRequest<User>("/auth/me");
}

export async function logout(): Promise<ApiResponse<null>> {
  return apiRequest<null>("/auth/logout", { method: "POST" });
}
