"use client";
import { useEffect, useRef } from "react";

const GLYPHS = [".", ".", ".", "+", ":", "·", "×", "#", "%", "/", "@"];
const CELL = 11, RADIUS = 150;
const hash = (a: number, b: number, c: number) => (((a * 73856093) ^ (b * 19349663) ^ (c * 83492791)) >>> 0) / 4294967296;

/** Custom outlined cursor + a field of small glyphs that appears around the pointer. */
export default function CursorField() {
  const cv = useRef<HTMLCanvasElement>(null);
  const arrow = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!matchMedia("(pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = cv.current!, ctx = canvas.getContext("2d")!, el = arrow.current!;
    const root = document.documentElement;
    root.classList.add("custom-cursor");
    let w = 0, h = 0, dpr = 1;
    const size = () => {
      dpr = window.devicePixelRatio || 1; w = innerWidth; h = innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    let mx = -999, my = -999, sx = -999, sy = -999, energy = 0, raf = 0;

    const move = (e: MouseEvent) => {
      mx = e.clientX; my = e.clientY; energy = 1;
      if (sx < 0) { sx = mx; sy = my; }
      const t = e.target as HTMLElement;
      const hot = !!t.closest("a,button,label,select,input[type=range],[data-hot]");
      const typing = !!t.closest("textarea");
      el.style.opacity = typing ? "0" : "1";
      el.style.transform = `translate(${mx}px,${my}px) scale(${hot ? 1.35 : 1})`;
    };
    const leave = () => { el.style.opacity = "0"; energy = 0; };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      energy *= 0.965;
      sx += (mx - sx) * 0.22; sy += (my - sy) * 0.22;
      ctx.clearRect(0, 0, w, h);
      if (energy < 0.03) return;
      const bucket = Math.floor(now / 170);
      const dark = root.dataset.theme === "dark";
      const base = dark ? "205,214,240" : "20,24,48", accent = dark ? "#4d7bff" : "#1b4dff", strong = dark ? "255,255,255" : "5,5,10";
      ctx.font = "10px ui-monospace, Consolas, monospace";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const gx0 = Math.floor((sx - RADIUS) / CELL), gx1 = Math.ceil((sx + RADIUS) / CELL);
      const gy0 = Math.floor((sy - RADIUS) / CELL), gy1 = Math.ceil((sy + RADIUS) / CELL);
      for (let gx = gx0; gx <= gx1; gx++) for (let gy = gy0; gy <= gy1; gy++) {
        const x = gx * CELL, y = gy * CELL, d = Math.hypot(x - sx, y - sy);
        const t = (1 - d / RADIUS) * Math.min(1, energy * 1.4);
        if (t <= 0) continue;
        const r = hash(gx, gy, bucket), keep = hash(gx, gy, 7);
        if (keep > t * 1.15) continue;
        const kind = hash(gx, gy, 3);
        if (kind < 0.04) { ctx.fillStyle = accent; ctx.fillRect(x - 1.5, y - 1.5, 3, 3); continue; }
        const near = t > 0.55;
        ctx.fillStyle = kind > 0.9 && near ? `rgba(${strong},${0.55 + 0.4 * t})` : `rgba(${base},${0.2 + 0.5 * t})`;
        ctx.fillText(near ? GLYPHS[Math.floor(r * GLYPHS.length)] : r > 0.5 ? "." : "+", x, y);
      }
    };
    raf = requestAnimationFrame(frame);
    addEventListener("mousemove", move); addEventListener("resize", size);
    document.addEventListener("mouseleave", leave);
    return () => {
      cancelAnimationFrame(raf); root.classList.remove("custom-cursor");
      removeEventListener("mousemove", move); removeEventListener("resize", size);
      document.removeEventListener("mouseleave", leave);
    };
  }, []);

  return (
    <>
      <canvas ref={cv} className="field" aria-hidden />
      <div ref={arrow} className="arrow" aria-hidden>
        <svg width="22" height="22" viewBox="0 0 22 22"><path d="M3 2 L18 10 L11 12 L9 19 Z" strokeWidth="1.6" strokeLinejoin="round" /></svg>
      </div>
    </>
  );
}
