import { apiRequest } from "@/api/client";
import type {
  ApiResponse,
  ChatSessionDetail,
  ChatSessionSummary,
  VoiceSession,
} from "@/types/api";

export async function startVoiceChat(): Promise<ApiResponse<VoiceSession>> {
  return apiRequest<VoiceSession>("/voice/start", { method: "POST" });
}

export async function resumeVoiceChat(
  sessionId: string,
): Promise<ApiResponse<VoiceSession>> {
  return apiRequest<VoiceSession>("/voice/resume", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId }),
  });
}

export async function listSessions(): Promise<
  ApiResponse<ChatSessionSummary[]>
> {
  return apiRequest<ChatSessionSummary[]>("/voice/sessions");
}

export async function getSession(
  sessionId: string,
): Promise<ApiResponse<ChatSessionDetail>> {
  return apiRequest<ChatSessionDetail>(`/voice/sessions/${sessionId}`);
}

export async function deleteSession(
  sessionId: string,
): Promise<ApiResponse<null>> {
  return apiRequest<null>(`/voice/sessions/${sessionId}`, {
    method: "DELETE",
  });
}

export async function stopVoiceSession(
  sessionId: string,
): Promise<ApiResponse<null>> {
  return apiRequest<null>(
    `/voice/stop?session_id=${encodeURIComponent(sessionId)}`,
    { method: "POST" },
  );
}
