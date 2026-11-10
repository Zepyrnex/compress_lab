"use client";
import { useEffect, useRef } from "react";

/** Big headline that always fills its column exactly: measures the widest line and scales the font to fit, at any window size or font. */
export default function FitTitle({ lines, dot }: { lines: string[]; dot?: string }) {
  const h = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = h.current;
    if (!el || !el.parentElement) return;
    const box = el.parentElement;
    const fit = () => {
      el.style.fontSize = "100px";
      let widest = 0;
      el.querySelectorAll<HTMLElement>(".ln").forEach((l) => { widest = Math.max(widest, l.getBoundingClientRect().width); });
      const avail = box.clientWidth;
      if (widest > 0 && avail > 0) el.style.fontSize = Math.max(40, (100 * avail * 0.985) / widest) + "px";
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, []);

  return (
    <h1 ref={h} className="glitch fit-title">
      {lines.map((t, i) => (
        <span key={t} className="ln">{t}{i === lines.length - 1 && dot ? <span className="dot">{dot}</span> : null}</span>
      ))}
    </h1>
  );
}
