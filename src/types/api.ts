export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export type UserRole = "admin" | "user";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthToken {
  token: string;
  type: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface UserUpdateRequest {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
}

export interface UserList {
  total: number;
  users: User[];
}

export interface ChatMessage {
  role: string;
  content: string;
}

export interface VoiceSession {
  session_id: string;
  ws_url: string;
  join_url: string;
  title: string;
  resumed: boolean;
  message_count: number;
}

export interface ChatSessionSummary {
  id: string;
  title: string;
  language: string;
  message_count: number;
  preview: string | null;
  created_at: string;
  updated_at: string;
  join_url: string | null;
}

export interface ChatSessionDetail {
  id: string;
  title: string;
  language: string;
  message_count: number;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
}

export type VoiceUiState =
  | "idle"
  | "calibrating"
  | "listening"
  | "recording"
  | "processing"
  | "speaking"
  | "paused";

export type TranscriptRole = "user" | "ai" | "sys";

export interface TranscriptEntry {
  id: string;
  role: TranscriptRole;
  text: string;
}

export interface WsReadyData {
  user: string;
  session_id: string;
  title: string | null;
  resumed: boolean;
}

export interface WsSpeechData {
  text: string;
  audio_base64: string;
  format?: string;
  language?: string;
}

export interface WsTranscriptData {
  text: string;
  language?: string;
}

export interface WsReplyData {
  reply: string;
  model: string;
  language?: string;
}

export interface WsHistoryData {
  messages: ChatMessage[];
  title: string;
}

export type WsServerMessage =
  | { type: "ready"; message?: string; data: WsReadyData }
  | { type: "history"; data: WsHistoryData }
  | { type: "listening"; message?: string }
  | { type: "processing"; message: string }
  | { type: "transcript"; data: WsTranscriptData }
  | { type: "reply"; data: WsReplyData }
  | { type: "speech"; data: WsSpeechData }
  | { type: "title_updated"; data: { title: string; session_id?: string } }
  | {
      type: "session_ended";
      message: string;
      data?: { session_id: string; call_stop_api: boolean };
    }
  | { type: "error"; message: string };
