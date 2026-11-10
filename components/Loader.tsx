"use client";
import { useEffect, useMemo, useState } from "react";

const pad = (n: number) => String(n).padStart(3, "0");

/** Short intro: percentage counter, node network inside a ring, blue progress bar. */
export default function Loader() {
  const [pct, setPct] = useState(0);
  const [phase, setPhase] = useState<"run" | "out" | "gone">("run");

  const net = useMemo(() => {
    let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const pts = Array.from({ length: 28 }, () => {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 42;
      return { x: 50 + Math.cos(a) * r, y: 50 + Math.sin(a) * r, s: 0.8 + rnd() * 2.2 };
    });
    const links = pts.flatMap((p, i) =>
      pts.map((q, j) => ({ i, j, d: Math.hypot(p.x - q.x, p.y - q.y) })).filter((l) => l.j > i && l.d < 20));
    return { pts, links };
  }, []);

  useEffect(() => {
    let skip = matchMedia("(prefers-reduced-motion: reduce)").matches;
    try { if (sessionStorage.getItem("lab-intro")) skip = true; else sessionStorage.setItem("lab-intro", "1"); } catch {}
    if (skip) { setPhase("gone"); return; }
    const t0 = performance.now(), DUR = 1900; let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / DUR);
      setPct(Math.round((1 - Math.pow(1 - p, 2)) * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setTimeout(() => { setPhase("out"); setTimeout(() => setPhase("gone"), 600); }, 250);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (phase === "gone") return null;
  const shown = Math.ceil((pct / 100) * net.pts.length);
  const done = pct >= 100;
  return (
    <div className={"loader" + (phase === "out" ? " out" : "")} role="status" aria-label="Loading">
      <div className="ld-list ld-l"><span>RLE {pad(Math.min(100, pct * 1.1 | 0))}%</span><span>Huffman {pad(Math.min(100, pct * 0.95 | 0))}%</span><span>LZSS {pad(Math.min(100, pct * 0.8 | 0))}%</span></div>
      <div className="ld-list ld-r"><span>Deflate {pad(Math.min(100, pct * 1.05 | 0))}%</span><span>Images {pad(Math.min(100, pct * 0.9 | 0))}%</span><span>PDF {pad(Math.min(100, pct * 0.85 | 0))}%</span></div>
      <div className="ld-ring">
        <svg viewBox="0 0 100 100">
          <circle className="ring" cx="50" cy="50" r="49" />
          {net.links.filter((l) => l.i < shown && l.j < shown).map((l, k) => (
            <line key={k} x1={net.pts[l.i].x} y1={net.pts[l.i].y} x2={net.pts[l.j].x} y2={net.pts[l.j].y} />
          ))}
          {net.pts.slice(0, shown).map((p, k) => <circle key={k} className="pt" cx={p.x} cy={p.y} r={p.s} />)}
        </svg>
        <i className="tick l" /><i className="tick r" />
      </div>
      <div className="ld-tag tl">Build // LAB-001</div><div className="ld-tag tr">System // {done ? "Ready" : "Alive"}</div>
      <div className="ld-tag bl">Protocol // Huffman</div><div className="ld-tag br">Status // {done ? "Ready" : "Initializing"}</div>
      <div className="ld-pct">{pad(pct)}%</div>
      <div className="ld-bar"><i style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }} /></div>
    </div>
  );
}
