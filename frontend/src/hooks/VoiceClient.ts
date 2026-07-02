import type { VoiceUiState } from "@/types/api";

export type VoiceLogRole = "user" | "ai" | "sys";

export interface VoiceClientCallbacks {
  onLog: (text: string, role: VoiceLogRole) => void;
  onStatus: (state: VoiceUiState, text: string) => void;
  onStop?: () => void;
  onAudioElement?: (audio: HTMLAudioElement | null) => void;
}

/**
 * Duplex voice with barge-in — mic stays open, interrupt to cut in.
 * Ported from backend app/assets/voice_client.js
 */
export class VoiceClient {
  private ws: WebSocket;
  private callbacks: VoiceClientCallbacks;

  private state: "idle" | "live" = "idle";
  private phase:
    | "idle"
    | "calibrating"
    | "ready"
    | "recording"
    | "processing"
    | "agent_speaking" = "idle";

  private stream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private monitorId: number | null = null;
  private chunks: Blob[] = [];
  private mimeType = "audio/webm";

  private userRecording = false;
  private silenceStart: number | null = null;
  private speechStart = 0;
  private interruptHoldStart: number | null = null;
  private noiseFloor = 0.004;
  private calibrating = true;
  private calibrationEnd = 0;

  private currentAudio: HTMLAudioElement | null = null;
  private speechResolve: ((value: string) => void) | null = null;
  private staleGeneration = -1;

  private readonly SILENCE_MS = 1000;
  private readonly MIN_SPEECH_MS = 700;
  private readonly SPEECH_MULTIPLIER = 1.7;
  private readonly INTERRUPT_MULTIPLIER = 3.2;
  private readonly INTERRUPT_MS = 500;
  private readonly MAX_RECORD_MS = 22000;
  private cooldownUntil = 0;
  private endAfterSpeech = false;

  constructor(ws: WebSocket, callbacks: VoiceClientCallbacks) {
    this.ws = ws;
    this.callbacks = callbacks;
  }

  private pickMimeType(): string {
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
    ];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return "audio/webm";
  }

  private extension(): "webm" | "ogg" {
    return this.mimeType.includes("ogg") ? "ogg" : "webm";
  }

  async start(): Promise<void> {
    this.mimeType = this.pickMimeType();
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: false,
        autoGainControl: true,
        sampleRate: { ideal: 48000 },
        channelCount: 1,
      },
    });

    this.audioContext = new AudioContext({
      sampleRate: 48000,
      latencyHint: "interactive",
    });
    await this.audioContext.resume();

    const source = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.5;
    source.connect(this.analyser);
    this.dataArray = new Uint8Array(this.analyser.fftSize);

    this.calibrating = true;
    this.calibrationEnd = Date.now() + 1200;
    this.state = "live";
    this.phase = "calibrating";
    this.callbacks.onStatus("calibrating", "Calibrating mic… stay quiet");
    this.callbacks.onLog("Speak naturally — interrupt me while I talk", "sys");
    this.monitor();
  }

  stop(): void {
    this.state = "idle";
    this.phase = "idle";
    this.endAfterSpeech = false;
    this.stopAgentAudio();
    if (this.monitorId !== null) cancelAnimationFrame(this.monitorId);
    if (this.mediaRecorder?.state === "recording") this.mediaRecorder.stop();
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.audioContext?.close();
    this.audioContext = null;
    this.analyser = null;
    this.callbacks.onAudioElement?.(null);
  }

  endSession(): void {
    this.endAfterSpeech = true;
    if (!this.currentAudio) this.completeEnd();
  }

  private completeEnd(): void {
    const cb = this.callbacks.onStop;
    this.stop();
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
    cb?.();
  }

  requestEnd(): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "end_session" }));
    }
  }

  onServerReady(): void {
    if (this.state !== "live") return;
    if (this.phase === "processing") {
      this.phase = "ready";
    }
    this.cooldownUntil = Date.now() + 400;
    this.callbacks.onStatus("listening", "Your turn — speak or interrupt anytime");
  }

  private rms(): number {
    if (!this.analyser || !this.dataArray) return 0;
    this.analyser.getByteTimeDomainData(this.dataArray);
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const v = (this.dataArray[i] - 128) / 128;
      sum += v * v;
    }
    return Math.sqrt(sum / this.dataArray.length);
  }

  private threshold(forInterrupt = false): number {
    const mult = forInterrupt
      ? this.INTERRUPT_MULTIPLIER
      : this.SPEECH_MULTIPLIER;
    const floor = forInterrupt ? 0.008 : 0.004;
    return Math.max(this.noiseFloor * mult, floor);
  }

  private stopAgentAudio(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.src = "";
      this.currentAudio = null;
      this.callbacks.onAudioElement?.(null);
    }
    if (this.speechResolve) {
      this.speechResolve("stopped");
      this.speechResolve = null;
    }
    if (this.phase === "agent_speaking") {
      this.phase = "ready";
      this.cooldownUntil = Date.now() + 300;
    }
  }

  private interruptAgent(): boolean {
    if (this.phase !== "agent_speaking" && this.phase !== "processing") {
      return false;
    }
    this.stopAgentAudio();
    if (this.phase === "processing") {
      this.staleGeneration += 1;
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "cancel" }));
      }
      this.callbacks.onLog("Interrupted — listening…", "sys");
    } else {
      this.callbacks.onLog("Interrupted — go ahead", "sys");
    }
    this.phase = "ready";
    return true;
  }

  private holdInterrupt(loud: boolean): boolean {
    const now = Date.now();
    if (loud) {
      if (!this.interruptHoldStart) this.interruptHoldStart = now;
      else if (now - this.interruptHoldStart >= this.INTERRUPT_MS) {
        this.interruptHoldStart = null;
        return true;
      }
    } else {
      this.interruptHoldStart = null;
    }
    return false;
  }

  private beginRecording(): void {
    if (this.mediaRecorder?.state === "recording" || !this.stream) return;
    this.stopAgentAudio();

    this.chunks = [];
    const opts = { mimeType: this.mimeType, audioBitsPerSecond: 256000 };
    this.mediaRecorder = new MediaRecorder(this.stream, opts);
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.mediaRecorder.start(250);
    this.userRecording = true;
    this.phase = "recording";
    this.silenceStart = null;
    this.callbacks.onStatus("recording", "Hearing you…");
    this.callbacks.onLog("🎤 Recording", "sys");
  }

  private monitor = (): void => {
    if (this.state !== "live") return;

    const level = this.rms();
    const now = Date.now();

    if (this.calibrating) {
      this.noiseFloor = this.noiseFloor * 0.85 + level * 0.15;
      if (now >= this.calibrationEnd) {
        this.calibrating = false;
        this.phase = "ready";
        this.callbacks.onStatus("listening", "Speak — pause 1 sec when done");
        this.callbacks.onLog("Ready — interrupt me anytime while I speak", "sys");
      }
      this.monitorId = requestAnimationFrame(this.monitor);
      return;
    }

    if (this.userRecording) {
      const loud = level > this.threshold(false);
      if (loud) {
        this.silenceStart = null;
        if (now - this.speechStart > this.MAX_RECORD_MS) this.finishUtterance();
      } else if (!this.silenceStart) {
        this.silenceStart = now;
      } else if (now - this.silenceStart >= this.SILENCE_MS) {
        if (now - this.speechStart >= this.MIN_SPEECH_MS) {
          this.finishUtterance();
        } else {
          this.cancelUtterance();
        }
      }
      this.monitorId = requestAnimationFrame(this.monitor);
      return;
    }

    const agentBusy =
      this.phase === "agent_speaking" || this.phase === "processing";
    if (agentBusy) {
      const loud = level > this.threshold(true);
      if (this.holdInterrupt(loud) && this.interruptAgent()) {
        this.speechStart = now;
        this.beginRecording();
      }
      this.monitorId = requestAnimationFrame(this.monitor);
      return;
    }

    if (this.phase === "ready" && now >= this.cooldownUntil) {
      const loud = level > this.threshold(false);
      if (loud) {
        this.speechStart = now;
        this.beginRecording();
      }
    }

    this.monitorId = requestAnimationFrame(this.monitor);
  };

  private async sendRecording(): Promise<void> {
    const blob = new Blob(this.chunks, { type: this.mimeType });
    const buffer = await blob.arrayBuffer();
    this.chunks = [];

    if (buffer.byteLength < 3000) {
      this.callbacks.onLog("Too quiet — speak louder", "sys");
      this.phase = "ready";
      this.callbacks.onStatus("listening", "Speak louder and try again");
      return;
    }

    if (this.ws.readyState !== WebSocket.OPEN) return;

    this.phase = "processing";
    this.callbacks.onStatus("processing", "Thinking…");

    this.ws.send(JSON.stringify({ type: "start", format: this.extension() }));
    this.ws.send(buffer);
    this.ws.send(JSON.stringify({ type: "stop" }));
    this.callbacks.onLog(
      `Sent ${(buffer.byteLength / 1024).toFixed(1)} KB`,
      "sys",
    );
  }

  private finishUtterance(): void {
    if (!this.userRecording) return;
    this.silenceStart = null;
    this.callbacks.onLog("Sending to agent…", "sys");

    const recorder = this.mediaRecorder;
    if (recorder?.state === "recording") {
      recorder.onstop = () => {
        this.userRecording = false;
        void this.sendRecording();
      };
      if (typeof recorder.requestData === "function") recorder.requestData();
      recorder.stop();
    } else {
      this.userRecording = false;
      void this.sendRecording();
    }
  }

  private cancelUtterance(): void {
    this.userRecording = false;
    this.silenceStart = null;
    this.chunks = [];
    if (this.mediaRecorder?.state === "recording") this.mediaRecorder.stop();
    this.phase = "ready";
    this.callbacks.onStatus("listening", "Speak a bit longer");
    this.callbacks.onLog("Too short — say a full phrase", "sys");
  }

  playSpeech(b64: string): Promise<string> {
    if (!b64) return Promise.resolve("empty");

    this.phase = "agent_speaking";
    this.interruptHoldStart = null;
    this.callbacks.onStatus(
      "speaking",
      "Speaking — talk over me to interrupt",
    );

    return new Promise((resolve) => {
      const audio = new Audio(`data:audio/mp3;base64,${b64}`);
      this.currentAudio = audio;
      this.speechResolve = resolve;
      this.callbacks.onAudioElement?.(audio);

      const finish = () => {
        if (this.currentAudio !== audio) return;
        this.currentAudio = null;
        this.speechResolve = null;
        if (this.phase === "agent_speaking") {
          this.phase = "ready";
          this.cooldownUntil = Date.now() + 500;
          if (!this.endAfterSpeech) {
            this.callbacks.onStatus("listening", "Your turn");
          }
        }
        this.callbacks.onAudioElement?.(null);
        resolve("done");
        if (this.endAfterSpeech) this.completeEnd();
      };

      audio.onended = finish;
      audio.onerror = finish;
      audio.play().catch(finish);
    });
  }
}
