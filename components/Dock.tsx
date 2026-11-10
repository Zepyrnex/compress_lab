"use client";
import { useEffect, useState } from "react";

const LINKS = [
  { id: "top", label: "Index" },
  { id: "lab", label: "Lab" },
  { id: "results", label: "Results" },
  { id: "info", label: "Info" },
];

type Theme = "light" | "dark";

/** Top bar that follows the page: full-width at the top, a floating pill once you scroll. Also hosts the theme toggle. */
export default function Dock() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("top");
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      setScrolled(window.scrollY > 24);
      const line = window.innerHeight * 0.35;
      let cur = "top";
      for (const l of LINKS) {
        const el = document.getElementById(l.id);
        if (el && el.getBoundingClientRect().top <= line) cur = l.id;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) cur = "info";
      setActive(cur);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => { removeEventListener("scroll", onScroll); removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("lab-theme", next); } catch {}
  };

  return (
    <header className={"dock-wrap" + (scrolled ? " scrolled" : "")}>
      <nav className="dock" aria-label="Primary">
        <a className="dk-cell dk-brand" href="#top" aria-label="File Compression Lab, back to top">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" aria-hidden>
            <path d="M3 4l7 8-7 8M21 4l-7 8 7 8" />
          </svg>
          <span>Compression Lab</span>
        </a>
        <div className="dk-nav">
          {LINKS.map((l) => (
            <a key={l.id} href={"#" + l.id} className={"dk-link" + (active === l.id ? " on" : "")} aria-current={active === l.id ? "true" : undefined}>
              {l.label}
            </a>
          ))}
          <button className="dk-link dk-theme" onClick={toggle} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} title="Toggle theme">
            {theme === "dark" ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z" />
              </svg>
            )}
            <span>{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
        </div>
      </nav>
    </header>
  );
}
