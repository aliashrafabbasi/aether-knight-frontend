import { useEffect, useRef } from "react";
import {
  getOptimizedDpr,
  getPerfSettings,
  getViewportSize,
  isAnimationPaused,
  isMobileWidth,
  shouldDrawFrame,
} from "@/utils/canvasPerf";

interface VoiceBackgroundProps {
  className?: string;
}

export function VoiceBackground({ className = "" }: VoiceBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const phaseRef = useRef(0);
  const perfRef = useRef(getPerfSettings(1280));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let running = true;
    let lastDraw = 0;

    const resize = () => {
      const { w, h } = getViewportSize();
      if (w < 1 || h < 1) return;
      perfRef.current = getPerfSettings(w);
      const dpr = getOptimizedDpr(w);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", resize);

    const onVisibility = () => {
      if (!document.hidden) lastDraw = 0;
    };
    document.addEventListener("visibilitychange", onVisibility);

    const draw = (now: number) => {
      if (!running) return;

      if (isAnimationPaused()) {
        frameRef.current = requestAnimationFrame(draw);
        return;
      }

      const perf = perfRef.current;
      if (!shouldDrawFrame(now, lastDraw, perf.frameIntervalMs)) {
        frameRef.current = requestAnimationFrame(draw);
        return;
      }
      lastDraw = now;

      const { w, h } = getViewportSize();
      const cx = w / 2;
      const cy = h * 0.42;
      const mobile = isMobileWidth(w);
      const particleCount = mobile ? 22 : 60;
      phaseRef.current += mobile ? 0.006 : 0.008;

      const pulse = 0.5 + Math.sin(phaseRef.current * 1.4) * 0.08;

      const bg = ctx.createRadialGradient(
        cx,
        cy,
        0,
        cx,
        cy,
        Math.max(w, h) * (0.65 + pulse * 0.1),
      );
      bg.addColorStop(0, "#2d1b4e");
      bg.addColorStop(0.35, "#1a1035");
      bg.addColorStop(0.7, "#0d0818");
      bg.addColorStop(1, "#06040e");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      for (let p = 0; p < particleCount; p++) {
        const angle = p * 2.399 + phaseRef.current * (0.2 + (p % 5) * 0.04);
        const dist =
          Math.min(w, h) * (0.15 + (p % 11) * 0.06) +
          Math.sin(phaseRef.current * 0.8 + p * 0.7) * 30;
        const px = cx + Math.cos(angle) * dist * (1 + (p % 3) * 0.3);
        const py = cy + Math.sin(angle) * dist * 0.85;
        const alpha = 0.04 + (p % 4) * 0.015 + Math.sin(phaseRef.current + p) * 0.01;
        ctx.fillStyle = `rgba(255, 150, 200, ${Math.max(0.02, alpha)})`;
        ctx.beginPath();
        ctx.arc(px, py, 0.8 + (p % 3) * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!mobile) {
        const scanY = ((phaseRef.current * 18) % 1) * h;
        const scan = ctx.createLinearGradient(0, scanY - 40, 0, scanY + 40);
        scan.addColorStop(0, "transparent");
        scan.addColorStop(0.5, "rgba(192, 38, 211, 0.03)");
        scan.addColorStop(1, "transparent");
        ctx.fillStyle = scan;
        ctx.fillRect(0, scanY - 40, w, 80);
      }

      const vignette = ctx.createRadialGradient(cx, cy, h * 0.2, cx, cy, Math.max(w, h) * 0.75);
      vignette.addColorStop(0, "transparent");
      vignette.addColorStop(1, "rgba(4, 2, 10, 0.55)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => {
      running = false;
      window.removeEventListener("resize", resize);
      window.removeEventListener("orientationchange", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none h-full w-full ${className}`}
      aria-hidden
    />
  );
}
