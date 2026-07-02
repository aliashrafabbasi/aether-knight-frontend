import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { stopVoiceSession } from "@/api/voice";
import { wsUrlForSession } from "@/api/client";
import { AiSubtitles } from "@/components/AiSubtitles";
import { VoiceBackground } from "@/components/VoiceBackground";
import { JarvisWave } from "@/components/JarvisWave";
import { TranscriptPanel } from "@/components/TranscriptPanel";
import { VoiceClient } from "@/hooks/VoiceClient";
import { useToast } from "@/context/ToastContext";
import type {
  TranscriptEntry,
  VoiceUiState,
  WsServerMessage,
} from "@/types/api";

function parseWsMessage(raw: string): WsServerMessage | null {
  try {
    return JSON.parse(raw) as WsServerMessage;
  } catch {
    return null;
  }
}

export function VoiceRoom() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [connected, setConnected] = useState(false);
  const [title, setTitle] = useState("Voice Chat");
  const [uiState, setUiState] = useState<VoiceUiState>("idle");
  const [statusText, setStatusText] = useState("Ready to connect");
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(
    null,
  );
  const [sessionEnded, setSessionEnded] = useState(false);
  const [aiSubtitle, setAiSubtitle] = useState<string | null>(null);
  const [subtitleUtteranceId, setSubtitleUtteranceId] = useState(0);
  const subtitleIdRef = useRef(0);

  const wsRef = useRef<WebSocket | null>(null);
  const voiceRef = useRef<VoiceClient | null>(null);
  const greetedRef = useRef(false);
  const pendingHistoryRef = useRef<{ role: string; content: string }[] | null>(
    null,
  );
  const stopApiCalledRef = useRef(false);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  const playAiSpeech = useCallback((text: string, audioBase64: string) => {
    subtitleIdRef.current += 1;
    setSubtitleUtteranceId(subtitleIdRef.current);
    setAiSubtitle(text);
    void voiceRef.current?.playSpeech(audioBase64);
  }, []);

  const addEntry = useCallback(
    (text: string, role: TranscriptEntry["role"]) => {
      setEntries((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role, text },
      ]);
    },
    [],
  );

  const stopApiMutation = useMutation({
    mutationFn: () => {
      if (!sessionId) return Promise.reject(new Error("No session"));
      return stopVoiceSession(sessionId);
    },
  });

  const callStopApi = useCallback(async () => {
    if (stopApiCalledRef.current || !sessionId) return;
    stopApiCalledRef.current = true;
    try {
      const res = await stopApiMutation.mutateAsync();
      if (res.message) addEntry(`✓ ${res.message}`, "sys");
    } catch (err) {
      stopApiCalledRef.current = false;
      const msg = err instanceof Error ? err.message : "Stop API failed";
      addEntry(msg, "sys");
      showToast(msg, "error");
    }
  }, [sessionId, stopApiMutation, addEntry, showToast]);

  const setStatus = useCallback((state: VoiceUiState, text: string) => {
    // Server sends "ready" right after speech starts — don't kill speaking UI mid-TTS
    if (state === "listening") {
      const audio = audioElementRef.current;
      if (audio && !audio.paused && !audio.ended) return;
    }
    setUiState(state);
    setStatusText(text);
  }, []);

  useEffect(() => {
    audioElementRef.current = audioElement;
    if (!audioElement) {
      setIsAudioPlaying(false);
      return;
    }

    const sync = () => {
      setIsAudioPlaying(!audioElement.paused && !audioElement.ended);
    };

    audioElement.addEventListener("play", sync);
    audioElement.addEventListener("playing", sync);
    audioElement.addEventListener("pause", sync);
    audioElement.addEventListener("ended", sync);
    sync();

    return () => {
      audioElement.removeEventListener("play", sync);
      audioElement.removeEventListener("playing", sync);
      audioElement.removeEventListener("pause", sync);
      audioElement.removeEventListener("ended", sync);
    };
  }, [audioElement]);

  const visualSpeaking = isAudioPlaying || uiState === "speaking";

  const showHistory = useCallback(
    (messages: { role: string; content: string }[]) => {
      if (!messages.length) return;
      addEntry("— Previous messages —", "sys");
      for (const m of messages) {
        addEntry(
          m.content,
          m.role === "user" ? "user" : "ai",
        );
      }
      addEntry("— Continuing conversation —", "sys");
    },
    [addEntry],
  );

  const handleMessage = useCallback(
    async (msg: WsServerMessage) => {
      if (msg.type === "processing") {
        setStatus("processing", msg.message);
        return;
      }
      if (msg.type === "transcript") {
        const lang = msg.data.language ?? "?";
        addEntry(`(${lang}) ${msg.data.text}`, "user");
        return;
      }
      if (msg.type === "title_updated") {
        const t = msg.data.title;
        if (t) {
          setTitle(t);
          addEntry(`Chat titled: ${t}`, "sys");
        }
        return;
      }
      if (msg.type === "reply") {
        addEntry(msg.data.reply, "ai");
        setStatus("processing", "Reply ready — loading voice…");
        return;
      }
      if (msg.type === "speech") {
        addEntry(msg.data.text, "ai");
        playAiSpeech(msg.data.text, msg.data.audio_base64);
        return;
      }
      if (msg.type === "error") {
        addEntry(`Error: ${msg.message}`, "sys");
        voiceRef.current?.onServerReady();
        showToast(msg.message, "error");
        return;
      }
      if (msg.type === "ready") {
        voiceRef.current?.onServerReady();
        if (msg.message) setStatus("listening", msg.message);
        return;
      }
      if (msg.type === "session_ended") {
        addEntry(msg.message || "Conversation ended.", "sys");
        setStatus("paused", "Chat ended — saved");
        setSessionEnded(true);
        await callStopApi();
        voiceRef.current?.endSession();
      }
    },
    [addEntry, setStatus, callStopApi, showToast, playAiSpeech],
  );

  const attachWsHandler = useCallback(
    (ws: WebSocket) => {
      ws.onmessage = async (e: MessageEvent) => {
        const msg = parseWsMessage(
          typeof e.data === "string" ? e.data : "",
        );
        if (!msg) return;

        if (msg.type === "history") {
          pendingHistoryRef.current = msg.data.messages;
          if (msg.data.title) setTitle(msg.data.title);
          return;
        }

        if (!greetedRef.current) {
          if (msg.type === "ready") {
            const name = msg.data.user || "there";
            const resumed = msg.data.resumed;
            addEntry(
              resumed ? `Resuming chat for ${name}.` : `Welcome, ${name}.`,
              "sys",
            );
            if (pendingHistoryRef.current) {
              showHistory(pendingHistoryRef.current);
              pendingHistoryRef.current = null;
            }
            return;
          }

          greetedRef.current = true;

          const startListening = async () => {
            if (!voiceRef.current) return;
            try {
              await voiceRef.current.start();
              setStatus("listening", "Talk naturally — interrupt anytime");
              addEntry("Duplex mic on — speak over the agent anytime", "sys");
            } catch (err) {
              const message =
                err instanceof Error ? err.message : "Microphone access denied";
              showToast(message, "error");
              addEntry(message, "sys");
            }
          };

          await startListening();

          if (msg.type === "speech") {
            addEntry(msg.data.text, "ai");
            playAiSpeech(msg.data.text, msg.data.audio_base64);
          }
          if (msg.type === "reply") {
            addEntry(msg.data.reply, "ai");
          }
          return;
        }

        await handleMessage(msg);
      };
    },
    [addEntry, showHistory, setStatus, handleMessage, showToast, playAiSpeech],
  );

  const connect = useCallback(() => {
    if (!sessionId || wsRef.current) return;

    addEntry("Connecting…", "sys");
    const ws = new WebSocket(wsUrlForSession(sessionId));
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      addEntry("Connected — agent is greeting you…", "sys");

      const client = new VoiceClient(ws, {
        onLog: (text, role) => addEntry(text, role),
        onStatus: setStatus,
        onAudioElement: setAudioElement,
        onStop: () => {
          setConnected(false);
          wsRef.current = null;
          voiceRef.current = null;
        },
      });
      voiceRef.current = client;
      attachWsHandler(ws);
    };

    ws.onclose = () => {
      addEntry("Disconnected", "sys");
      voiceRef.current?.stop();
      setConnected(false);
      wsRef.current = null;
      voiceRef.current = null;
    };

    ws.onerror = () => {
      addEntry("WebSocket error", "sys");
      showToast("Connection error", "error");
    };
  }, [sessionId, addEntry, setStatus, attachWsHandler, showToast]);

  const handleStopChat = useCallback(async () => {
    if (!voiceRef.current) return;
    addEntry("Ending conversation…", "sys");
    await callStopApi();
    voiceRef.current.requestEnd();
  }, [addEntry, callStopApi]);

  useEffect(() => {
    return () => {
      voiceRef.current?.stop();
      wsRef.current?.close();
    };
  }, []);

  if (!sessionId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-jarvis-bg text-white">
        <p>Invalid session</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen text-slate-100">
      {/* Full-page animated background only */}
      <VoiceBackground className="fixed inset-0 z-0" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/20 bg-jarvis-bg/60 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Link
              to="/home"
              className="rounded border border-cyan-500/30 px-3 py-1.5 text-sm text-cyan-300 transition hover:bg-cyan-500/10"
            >
              ← Home
            </Link>
            <span className="font-display text-lg tracking-[0.25em] text-jarvis-cyan">
              AETHER KNIGHT
            </span>
          </div>
          {connected && !sessionEnded && (
            <button
              type="button"
              onClick={() => void handleStopChat()}
              className="rounded border border-red-500/50 bg-red-950/40 px-4 py-1.5 text-sm text-red-200 transition hover:bg-red-900/50"
            >
              Stop Chat
            </button>
          )}
        </header>

        <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 py-6">
          <div>
            <h1 className="font-display text-xl text-white">{title}</h1>
            <p className="mt-1 text-sm text-amber-200/80">
              🎧 Use headphones for best results — prevents echo feedback
            </p>
          </div>

          {!connected && !sessionEnded && (
            <button
              type="button"
              onClick={connect}
              className="mx-auto rounded-xl bg-emerald-600 px-8 py-3 text-lg font-semibold text-white shadow-lg transition hover:bg-emerald-500"
            >
              ▶ Start Conversation
            </button>
          )}

          {/* Wave orb + subtitles */}
          <div className="flex w-full flex-col">
            <JarvisWave
              state={uiState}
              audioElement={audioElement}
              audioActive={visualSpeaking}
              className="w-full"
            />
            <div className="mt-2 flex min-h-[2.5rem] justify-start px-2 sm:mt-3 sm:px-4">
              {aiSubtitle && (
                <AiSubtitles
                  key={subtitleUtteranceId}
                  text={aiSubtitle}
                  audioElement={audioElement}
                  playing={isAudioPlaying}
                />
              )}
            </div>
          </div>

          <p className="mt-8 text-center font-body text-sm text-cyan-100/70 sm:mt-10 sm:text-base">
            {statusText}
          </p>

          <div className="mt-6 space-y-5 sm:mt-8">
            <TranscriptPanel entries={entries} />

            <div className="flex flex-wrap justify-center gap-3 pb-6">
              <Link
                to="/home"
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                Back to Home
              </Link>
              <button
                type="button"
                onClick={() => navigate("/home")}
                className="rounded-lg bg-violet-700 px-4 py-2 text-sm text-white hover:bg-violet-600"
              >
                + New Chat
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
