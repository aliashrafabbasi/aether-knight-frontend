export function getViewportSize() {
  const vv = window.visualViewport;
  return {
    w: Math.round(vv?.width ?? window.innerWidth),
    h: Math.round(vv?.height ?? window.innerHeight),
  };
}

export function getOptimizedDpr(width: number): number {
  const dpr = window.devicePixelRatio || 1;
  if (width < 768) return 1;
  if (width < 1024) return Math.min(dpr, 1.25);
  return Math.min(dpr, 2);
}

export function isMobileWidth(w: number): boolean {
  return w < 768;
}

export interface PerfSettings {
  skipBokeh: boolean;
  skipCrests: boolean;
  frameIntervalMs: number;
}

export function getPerfSettings(w: number): PerfSettings {
  const mobile = isMobileWidth(w);
  return {
    skipBokeh: mobile,
    skipCrests: mobile,
    frameIntervalMs: mobile ? 1000 / 30 : 1000 / 55,
  };
}

export function shouldDrawFrame(
  now: number,
  lastDraw: number,
  intervalMs: number,
): boolean {
  return now - lastDraw >= intervalMs;
}

export function isAnimationPaused(): boolean {
  return document.hidden;
}

/** Fewer particles on mobile — keeps look, cuts draw calls ~60% */
export function waveGridCols(w: number): number {
  if (w < 768) return Math.max(32, Math.min(44, Math.floor(w / 8)));
  if (w < 1024) return Math.max(72, Math.min(110, Math.floor(w / 3.5)));
  return Math.max(120, Math.min(180, Math.floor(w / 2.8)));
}

export function waveGridRows(w: number, h: number): number {
  const isMobile = w < 768;
  const isShort = h < 520;
  if (isMobile && isShort) return 4;
  if (isMobile) return 5;
  if (isShort) return 7;
  return 9;
}

export function waveBokehCount(w: number): number {
  if (w < 768) return 0;
  if (w < 1024) return 12;
  return 24;
}
