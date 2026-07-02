import { useEffect, useRef } from "react";

interface VoiceBackgroundProps {
  className?: string;
}

export function VoiceBackground({ className = "" }: VoiceBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const phaseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const cx = w / 2;
      const cy = h * 0.42;
      phaseRef.current += 0.008;

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

      // Subtle drifting particles across full page
      for (let p = 0; p < 60; p++) {
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

      // Soft scan shimmer
      const scanY = ((phaseRef.current * 18) % 1) * h;
      const scan = ctx.createLinearGradient(0, scanY - 40, 0, scanY + 40);
      scan.addColorStop(0, "transparent");
      scan.addColorStop(0.5, "rgba(192, 38, 211, 0.03)");
      scan.addColorStop(1, "transparent");
      ctx.fillStyle = scan;
      ctx.fillRect(0, scanY - 40, w, 80);

      // Edge vignette
      const vignette = ctx.createRadialGradient(cx, cy, h * 0.2, cx, cy, Math.max(w, h) * 0.75);
      vignette.addColorStop(0, "transparent");
      vignette.addColorStop(1, "rgba(4, 2, 10, 0.55)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener("resize", resize);
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
