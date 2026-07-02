import { useEffect, useRef, type ReactNode } from "react";

interface AuthBackgroundProps {
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
  kind: "cyan" | "red" | "orange";
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

function getViewportSize() {
  const vv = window.visualViewport;
  return {
    w: Math.round(vv?.width ?? window.innerWidth),
    h: Math.round(vv?.height ?? window.innerHeight),
  };
}

function computeLayout(w: number, h: number): SceneLayout {
  const short = Math.min(w, h);
  const scale = Math.max(0.5, Math.min(1.45, short / 780));
  const isMobile = w < 640;
  const isTablet = w < 1024;
  const isLandscape = w > h;
  const isShort = h < 520;

  const cols = isMobile
    ? Math.max(64, Math.min(100, Math.floor(w / 3.8)))
    : isTablet
      ? Math.max(90, Math.min(130, Math.floor(w / 3.2)))
      : Math.max(120, Math.min(180, Math.floor(w / 2.8)));

  let rows = 9;
  if (isMobile && isShort) rows = 6;
  else if (isMobile) rows = 7;
  else if (isShort) rows = 7;

  // Keep waves visible above/below the form on every aspect ratio
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
    bokehCount: isMobile ? 14 : isTablet ? 18 : 24,
    bokehMinR: 45 * scale,
    bokehMaxR: (60 + 110 * scale) * (isMobile ? 0.85 : 1),
    driftX: 28 * scale,
    driftY: 20 * scale,
    crestStep: isMobile ? 6 : 4,
    crestSize: Math.max(1.4, 2.2 * scale),
    particleScale: Math.max(0.7, scale),
  };
}

function lerpColor(mix: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, mix));
  if (t < 0.45) {
    const k = t / 0.45;
    return [
      Math.round(k * 40),
      Math.round(180 + k * 60),
      Math.round(255 - k * 30),
    ];
  }
  if (t < 0.7) {
    const k = (t - 0.45) / 0.25;
    return [
      Math.round(40 + k * 180),
      Math.round(240 - k * 120),
      Math.round(225 - k * 175),
    ];
  }
  const k = (t - 0.7) / 0.3;
  return [
    Math.round(220 + k * 35),
    Math.round(120 - k * 70),
    Math.round(50 - k * 30),
  ];
}

export function AuthBackground({ children }: AuthBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const particlesRef = useRef<WaveParticle[]>([]);
  const bokehRef = useRef<BokehLight[]>([]);
  const layoutRef = useRef<SceneLayout>(computeLayout(1280, 800));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let running = true;
    let resizeTimer = 0;

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
      const kinds: BokehLight["kind"][] = ["cyan", "red", "orange"];
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
      const layout = computeLayout(w, h);
      layoutRef.current = layout;

      const isMobile = w < 768;
      const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);

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
      resizeTimer = window.setTimeout(applyResize, 80);
    };

    applyResize();
    window.addEventListener("resize", scheduleResize);
    window.addEventListener("orientationchange", scheduleResize);
    window.visualViewport?.addEventListener("resize", scheduleResize);
    window.visualViewport?.addEventListener("scroll", scheduleResize);

    const start = performance.now();
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const draw = (now: number) => {
      if (!running) return;

      const layout = layoutRef.current;
      const { w, h, cols, rows, cy, rowGap, waveAmp, waveAmp2, waveAmp3 } =
        layout;
      const cx = w / 2;
      const t = (now - start) / 1000;
      const flow = reducedMotion ? 0 : t * 1.8;

      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.9);
      bg.addColorStop(0, "#08101e");
      bg.addColorStop(0.45, "#040810");
      bg.addColorStop(1, "#010308");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const glowW = Math.min(w * 0.5, 520 * layout.scale);
      const leftPool = ctx.createRadialGradient(
        w * 0.12,
        cy,
        0,
        w * 0.12,
        cy,
        glowW,
      );
      leftPool.addColorStop(0, "rgba(0, 160, 255, 0.14)");
      leftPool.addColorStop(1, "transparent");
      ctx.fillStyle = leftPool;
      ctx.fillRect(0, 0, w, h);

      const rightPool = ctx.createRadialGradient(
        w * 0.88,
        cy,
        0,
        w * 0.88,
        cy,
        glowW * 0.95,
      );
      rightPool.addColorStop(0, "rgba(255, 60, 80, 0.13)");
      rightPool.addColorStop(1, "transparent");
      ctx.fillStyle = rightPool;
      ctx.fillRect(0, 0, w, h);

      for (const orb of bokehRef.current) {
        const ox =
          orb.x + Math.sin(t * orb.speed + orb.phase) * layout.driftX;
        const oy =
          orb.y + Math.cos(t * orb.speed * 0.7 + orb.phase) * layout.driftY;
        const pulse = 0.8 + Math.sin(t * 1.1 + orb.phase) * 0.2;
        const radius = orb.r * pulse;

        const grad = ctx.createRadialGradient(ox, oy, 0, ox, oy, radius);
        if (orb.kind === "cyan") {
          grad.addColorStop(0, "rgba(0, 200, 255, 0.16)");
          grad.addColorStop(0.45, "rgba(0, 140, 220, 0.05)");
        } else if (orb.kind === "red") {
          grad.addColorStop(0, "rgba(255, 50, 80, 0.15)");
          grad.addColorStop(0.45, "rgba(220, 30, 60, 0.05)");
        } else {
          grad.addColorStop(0, "rgba(255, 120, 50, 0.13)");
          grad.addColorStop(0.45, "rgba(255, 80, 30, 0.04)");
        }
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(ox, oy, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "lighter";

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
        const heightMix = p.u + wave * 0.0015;
        const [r, g, b] = lerpColor(heightMix);

        const twinkle = reducedMotion
          ? 0.8
          : 0.55 + 0.45 * Math.sin(t * 2.8 + p.twinkle + p.u * 8);
        const depth = 1 - p.row * 0.07;
        const alpha = (0.22 + twinkle * 0.28) * depth;
        const size = p.size * (0.9 + twinkle * 0.5) * depth;

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";

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

      const vignette = ctx.createRadialGradient(
        cx,
        cy,
        h * 0.08,
        cx,
        cy,
        Math.max(w, h) * 0.75,
      );
      vignette.addColorStop(0, "transparent");
      vignette.addColorStop(0.6, "rgba(2, 4, 10, 0.25)");
      vignette.addColorStop(1, "rgba(0, 0, 5, 0.75)");
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
      window.visualViewport?.removeEventListener("scroll", scheduleResize);
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#020408]">
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-0 block h-[100dvh] w-full"
        aria-hidden
      />
      <div className="relative z-10 flex min-h-[100dvh] items-center justify-center px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-6 sm:py-8">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
