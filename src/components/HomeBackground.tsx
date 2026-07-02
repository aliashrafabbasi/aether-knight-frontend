import { useEffect, useRef, type ReactNode } from "react";
import {
  getOptimizedDpr,
  getPerfSettings,
  getViewportSize,
  isAnimationPaused,
  shouldDrawFrame,
  waveBokehCount,
  waveGridCols,
  waveGridRows,
} from "@/utils/canvasPerf";

interface HomeBackgroundProps {
  children: ReactNode;
}

interface WaveParticle {
  u: number;
  row: number;
  size: number;
  twinkle: number;
}

interface BokehLight {
  x: number;
  y: number;
  r: number;
  kind: "orange" | "purple" | "magenta";
  phase: number;
  speed: number;
}

interface SceneLayout {
  w: number;
  h: number;
  cols: number;
  rows: number;
  scale: number;
  cy: number;
  rowGap: number;
  waveAmp: number;
  waveAmp2: number;
  waveAmp3: number;
  bokehCount: number;
  bokehMinR: number;
  bokehMaxR: number;
  driftX: number;
  driftY: number;
  crestStep: number;
  crestSize: number;
  particleScale: number;
}

function computeLayout(w: number, h: number): SceneLayout {
  const short = Math.min(w, h);
  const scale = Math.max(0.5, Math.min(1.45, short / 780));
  const isMobile = w < 640;
  const isLandscape = w > h;

  const cols = waveGridCols(w);
  const rows = waveGridRows(w, h);

  let cy = h * 0.52;
  if (isMobile && !isLandscape) cy = h * 0.44;
  else if (isLandscape && h < 500) cy = h * 0.55;
  else if (h > w * 1.6) cy = h * 0.46;

  return {
    w,
    h,
    cols,
    rows,
    scale,
    cy,
    rowGap: 12 * scale,
    waveAmp: 38 * scale,
    waveAmp2: 16 * scale,
    waveAmp3: 22 * scale,
    bokehCount: waveBokehCount(w),
    bokehMinR: 45 * scale,
    bokehMaxR: (60 + 110 * scale) * (isMobile ? 0.85 : 1),
    driftX: 28 * scale,
    driftY: 20 * scale,
    crestStep: isMobile ? 8 : 4,
    crestSize: Math.max(1.4, 2.2 * scale),
    particleScale: Math.max(0.7, scale),
  };
}

/** Orange (left) → purple/magenta (right) — cosmic knight palette */
function lerpColor(mix: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, mix));
  if (t < 0.42) {
    const k = t / 0.42;
    return [
      Math.round(255 - k * 20),
      Math.round(70 + k * 70),
      Math.round(10 + k * 50),
    ];
  }
  if (t < 0.68) {
    const k = (t - 0.42) / 0.26;
    return [
      Math.round(235 - k * 100),
      Math.round(140 - k * 90),
      Math.round(60 + k * 140),
    ];
  }
  const k = (t - 0.68) / 0.32;
  return [
    Math.round(135 - k * 30),
    Math.round(50 - k * 20),
    Math.round(200 + k * 55),
  ];
}

export function HomeBackground({ children }: HomeBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const particlesRef = useRef<WaveParticle[]>([]);
  const bokehRef = useRef<BokehLight[]>([]);
  const layoutRef = useRef<SceneLayout>(computeLayout(1280, 800));
  const perfRef = useRef(getPerfSettings(1280));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let running = true;
    let resizeTimer = 0;
    let lastDraw = 0;

    const buildParticles = (layout: SceneLayout) => {
      particlesRef.current = [];
      for (let row = 0; row < layout.rows; row++) {
        for (let col = 0; col < layout.cols; col++) {
          particlesRef.current.push({
            u: col / Math.max(1, layout.cols - 1),
            row,
            size: (0.85 + Math.random() * 1.3) * layout.particleScale,
            twinkle: Math.random() * Math.PI * 2,
          });
        }
      }
    };

    const buildBokeh = (layout: SceneLayout) => {
      const kinds: BokehLight["kind"][] = ["orange", "purple", "magenta"];
      bokehRef.current = Array.from({ length: layout.bokehCount }, (_, i) => ({
        x: Math.random() * layout.w,
        y: Math.random() * layout.h,
        r:
          layout.bokehMinR +
          Math.random() * (layout.bokehMaxR - layout.bokehMinR),
        kind: kinds[i % 3],
        phase: Math.random() * Math.PI * 2,
        speed: 0.25 + Math.random() * 0.45,
      }));
    };

    const applyResize = () => {
      const { w, h } = getViewportSize();
      if (w < 50 || h < 50) return;

      const layout = computeLayout(w, h);
      layoutRef.current = layout;
      perfRef.current = getPerfSettings(w);

      const dpr = getOptimizedDpr(w);

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      buildParticles(layout);
      buildBokeh(layout);
    };

    const scheduleResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(applyResize, 120);
    };

    applyResize();
    window.addEventListener("resize", scheduleResize);
    window.addEventListener("orientationchange", scheduleResize);
    window.visualViewport?.addEventListener("resize", scheduleResize);

    const onVisibility = () => {
      if (!document.hidden) lastDraw = 0;
    };
    document.addEventListener("visibilitychange", onVisibility);

    const start = performance.now();

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

      const layout = layoutRef.current;
      const { w, h, cols, rows, cy, rowGap, waveAmp, waveAmp2, waveAmp3 } =
        layout;
      const cx = w / 2;
      const t = (now - start) / 1000;
      const flow = t * 1.8;

      // Deep cosmic base
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.9);
      bg.addColorStop(0, "#0c0618");
      bg.addColorStop(0.45, "#060310");
      bg.addColorStop(1, "#020108");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const glowW = Math.min(w * 0.5, 520 * layout.scale);

      // Orange nebula — left (gentle drift like login)
      const orangeCx = w * 0.12 + Math.sin(t * 0.35) * 22 * layout.scale;
      const orangeCy = cy + Math.cos(t * 0.28) * 14 * layout.scale;
      const leftPool = ctx.createRadialGradient(
        orangeCx,
        orangeCy,
        0,
        orangeCx,
        orangeCy,
        glowW,
      );
      leftPool.addColorStop(0, "rgba(255, 90, 20, 0.18)");
      leftPool.addColorStop(0.5, "rgba(255, 50, 10, 0.06)");
      leftPool.addColorStop(1, "transparent");
      ctx.fillStyle = leftPool;
      ctx.fillRect(0, 0, w, h);

      // Purple nebula — right (gentle drift like login)
      const purpleCx = w * 0.88 + Math.sin(t * 0.3 + 1) * 20 * layout.scale;
      const purpleCy = cy + Math.cos(t * 0.25 + 2) * 12 * layout.scale;
      const rightPool = ctx.createRadialGradient(
        purpleCx,
        purpleCy,
        0,
        purpleCx,
        purpleCy,
        glowW * 0.95,
      );
      rightPool.addColorStop(0, "rgba(160, 50, 255, 0.19)");
      rightPool.addColorStop(0.5, "rgba(120, 30, 200, 0.07)");
      rightPool.addColorStop(1, "transparent");
      ctx.fillStyle = rightPool;
      ctx.fillRect(0, 0, w, h);

      // Drifting bokeh orbs
      for (const orb of bokehRef.current) {
        if (perf.skipBokeh) break;
        const ox = orb.x + Math.sin(t * orb.speed + orb.phase) * layout.driftX;
        const oy = orb.y + Math.cos(t * orb.speed * 0.7 + orb.phase) * layout.driftY;
        const pulse = 0.8 + Math.sin(t * 1.1 + orb.phase) * 0.2;
        const radius = orb.r * pulse;

        const grad = ctx.createRadialGradient(ox, oy, 0, ox, oy, radius);
        if (orb.kind === "orange") {
          grad.addColorStop(0, "rgba(255, 100, 30, 0.18)");
          grad.addColorStop(0.45, "rgba(255, 60, 10, 0.06)");
        } else if (orb.kind === "purple") {
          grad.addColorStop(0, "rgba(150, 60, 255, 0.17)");
          grad.addColorStop(0.45, "rgba(100, 30, 200, 0.06)");
        } else {
          grad.addColorStop(0, "rgba(230, 70, 200, 0.15)");
          grad.addColorStop(0.45, "rgba(180, 40, 160, 0.05)");
        }
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(ox, oy, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "lighter";

      // Flowing particle waves — smooth undulation like login
      for (const p of particlesRef.current) {
        const x = p.u * w;
        const rowOffset = (p.row - rows / 2) * rowGap;
        const rowDamp = 2.5 * layout.scale;

        const wave =
          Math.sin(p.u * Math.PI * 5.5 + flow + p.row * 0.35) *
            (waveAmp - p.row * rowDamp) +
          Math.sin(p.u * Math.PI * 9 - flow * 1.4 + p.row * 0.5) * waveAmp2 +
          Math.sin(p.u * Math.PI * 2.5 + flow * 0.6) * waveAmp3;

        const y = cy + rowOffset + wave;
        const [r, g, b] = lerpColor(p.u);

        const twinkle = 0.55 + 0.45 * Math.sin(t * 2.8 + p.twinkle + p.u * 8);
        const depth = 1 - p.row * 0.07;
        const alpha = (0.22 + twinkle * 0.28) * depth;
        const size = p.size * (0.9 + twinkle * 0.5) * depth;

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";

      // Bright wave crests
      if (!perf.skipCrests) {
      for (let i = 0; i < cols; i += layout.crestStep) {
        const u = i / Math.max(1, cols - 1);
        const x = u * w;
        const wave =
          Math.sin(u * Math.PI * 5.5 + flow) * waveAmp +
          Math.sin(u * Math.PI * 9 - flow * 1.4) * waveAmp2 +
          Math.sin(u * Math.PI * 2.5 + flow * 0.6) * waveAmp3;
        const y = cy + wave;
        const [r, g, b] = lerpColor(u);
        const peak = 0.5 + Math.sin(u * Math.PI * 5.5 + flow) * 0.5;
        if (peak > 0.75) {
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(peak - 0.75) * 0.6})`;
          ctx.beginPath();
          ctx.arc(x, y, layout.crestSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      }

      const vignette = ctx.createRadialGradient(
        cx,
        cy,
        h * 0.08,
        cx,
        cy,
        Math.max(w, h) * 0.75,
      );
      vignette.addColorStop(0, "transparent");
      vignette.addColorStop(0.6, "rgba(2, 0, 8, 0.25)");
      vignette.addColorStop(1, "rgba(0, 0, 4, 0.75)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);

    return () => {
      running = false;
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", scheduleResize);
      window.removeEventListener("orientationchange", scheduleResize);
      window.visualViewport?.removeEventListener("resize", scheduleResize);
      document.removeEventListener("visibilitychange", onVisibility);
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#020108]">
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-0 block h-[100dvh] w-full"
        aria-hidden
      />
      <div className="relative z-10 flex min-h-[100dvh] flex-col">
        {children}
      </div>
    </div>
  );
}
