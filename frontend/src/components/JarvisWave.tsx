import { useEffect, useRef } from "react";
import type { VoiceUiState } from "@/types/api";

interface JarvisWaveProps {
  state: VoiceUiState;
  audioElement: HTMLAudioElement | null;
  audioActive?: boolean;
  className?: string;
}

const WAVE_LAYERS = [
  { hue: [255, 107, 157], phase: 0, freq: 5, speed: 1.1 },
  { hue: [192, 38, 211], phase: 1.2, freq: 6, speed: -0.9 },
  { hue: [249, 115, 22], phase: 2.4, freq: 4, speed: 1.3 },
  { hue: [253, 164, 175], phase: 0.8, freq: 7, speed: -1.1 },
  { hue: [255, 255, 255], phase: 3.1, freq: 5, speed: 0.8 },
  { hue: [236, 72, 153], phase: 1.9, freq: 8, speed: 1.0 },
  { hue: [251, 146, 60], phase: 2.7, freq: 6, speed: -1.2 },
  { hue: [244, 114, 182], phase: 0.5, freq: 9, speed: 0.95 },
];

export function JarvisWave({
  state,
  audioElement,
  audioActive = false,
  className = "",
}: JarvisWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const freqDataRef = useRef<Uint8Array | null>(null);
  const frameRef = useRef(0);
  const phaseRef = useRef(0);
  const ampRef = useRef(0.12);

  useEffect(() => {
    if (!audioElement) {
      analyserRef.current = null;
      if (audioCtxRef.current?.state !== "closed") {
        void audioCtxRef.current?.close();
      }
      audioCtxRef.current = null;
      return;
    }

    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    const source = ctx.createMediaElementSource(audioElement);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.78;
    source.connect(analyser);
    analyser.connect(ctx.destination);
    analyserRef.current = analyser;
    freqDataRef.current = new Uint8Array(analyser.frequencyBinCount);
    void ctx.resume();

    return () => {
      source.disconnect();
      analyser.disconnect();
      void ctx.close();
      analyserRef.current = null;
      audioCtxRef.current = null;
    };
  }, [audioElement]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const cx = w / 2;
      const cy = h / 2;

      let targetAmp = 0.1;
      const analyser = analyserRef.current;
      const freqData = freqDataRef.current;
      const isSpeaking = state === "speaking" || audioActive;

      if (isSpeaking) {
        if (analyser && freqData) {
          analyser.getByteFrequencyData(freqData);
          let sum = 0;
          const slice = Math.floor(freqData.length * 0.45);
          for (let i = 0; i < slice; i++) sum += freqData[i];
          const level = sum / slice / 255;
          targetAmp = 0.32 + level * 0.55 + Math.sin(phaseRef.current * 2.8) * 0.06;
        } else {
          targetAmp = 0.3 + Math.sin(phaseRef.current * 2.6) * 0.08;
        }
      } else if (state === "recording") {
        targetAmp = 0.24 + Math.sin(phaseRef.current * 2.5) * 0.08;
      } else if (state === "processing") {
        targetAmp = 0.16 + Math.sin(phaseRef.current * 1.2) * 0.05;
      } else if (state === "listening" || state === "calibrating") {
        targetAmp = 0.12 + Math.sin(phaseRef.current * 0.6) * 0.03;
      } else {
        targetAmp = 0.08 + Math.sin(phaseRef.current * 0.4) * 0.02;
      }

      ampRef.current += (targetAmp - ampRef.current) * 0.12;
      phaseRef.current += 0.022;

      // Standard orb size — scales gently with container (responsive)
      const sizeBase = Math.min(w, h);
      const responsive = Math.min(Math.max(sizeBase / 400, 0.88), 1.12);
      const baseR = sizeBase * 0.27 * responsive * (1 + ampRef.current * 0.5);

      ctx.clearRect(0, 0, w, h);

      // Local glow around orb only (background is separate full-page layer)
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 1.7);
      glow.addColorStop(0, `rgba(255, 120, 180, ${0.1 + ampRef.current * 0.16})`);
      glow.addColorStop(0.5, `rgba(192, 38, 211, ${0.05 + ampRef.current * 0.08})`);
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, baseR * 1.7, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = "lighter";

      for (let layer = 0; layer < WAVE_LAYERS.length; layer++) {
        const cfg = WAVE_LAYERS[layer];
        const [r, g, b] = cfg.hue;
        const layerAmp = ampRef.current * (1 - layer * 0.05);
        const radius = baseR * (0.78 + layer * 0.035);
        const rot = phaseRef.current * cfg.speed + cfg.phase;
        const segments = 180;

        ctx.beginPath();
        for (let s = 0; s <= segments; s++) {
          const angle = (s / segments) * Math.PI * 2;
          const wave =
            1 +
            Math.sin(angle * cfg.freq + rot * 3) * layerAmp * 0.58 +
            Math.sin(angle * (cfg.freq + 2) - rot * 2) * layerAmp * 0.26;
          const r2 = radius * wave;
          const px = cx + Math.cos(angle + rot * 0.15) * r2;
          const py = cy + Math.sin(angle + rot * 0.15) * r2 * 0.92;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();

        const alpha = 0.32 + layerAmp * 0.42 - layer * 0.02;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${Math.max(0.14, alpha)})`;
        ctx.lineWidth = 1.2 + layerAmp * 1.6;
        ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.55)`;
        ctx.shadowBlur = 10 + layerAmp * 16;
        ctx.stroke();
      }

      ctx.globalCompositeOperation = "source-over";
      ctx.shadowBlur = 0;

      const hole = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 0.35);
      hole.addColorStop(0, "rgba(8, 6, 18, 0.95)");
      hole.addColorStop(0.7, "rgba(8, 6, 18, 0.4)");
      hole.addColorStop(1, "transparent");
      ctx.fillStyle = hole;
      ctx.beginPath();
      ctx.arc(cx, cy, baseR * 0.38, 0, Math.PI * 2);
      ctx.fill();

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frameRef.current);
    };
  }, [state, audioElement, audioActive]);

  return (
    <div className={`relative overflow-visible ${className}`}>
      <canvas
        ref={canvasRef}
        className="mx-auto h-[clamp(290px,54vw,430px)] w-full max-w-2xl bg-transparent sm:max-w-3xl"
      />
    </div>
  );
}
