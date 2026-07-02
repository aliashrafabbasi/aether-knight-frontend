import { apiRequest } from "@/api/client";
import type { ApiResponse, User, UserList, UserUpdateRequest } from "@/types/api";

export async function listUsers(): Promise<ApiResponse<UserList>> {
  return apiRequest<UserList>("/admin/users");
}

export async function updateUser(
  userId: string,
  payload: UserUpdateRequest,
): Promise<ApiResponse<User>> {
  return apiRequest<User>(`/admin/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteUser(
  userId: string,
): Promise<ApiResponse<null>> {
  return apiRequest<null>(`/admin/users/${userId}`, {
    method: "DELETE",
  });
}
