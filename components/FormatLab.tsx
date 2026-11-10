"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { fmtBytes } from "@/lib/analyze";
import { FormatResult, Item, KINDS, Kind, Opts, compressFormat, defaultOpts, kindOf } from "@/lib/formats";

export default function FormatLab({ files, kindOverride, initialOpts }: {
  files: Item[];
  kindOverride?: Kind;
  initialOpts?: Partial<Opts>;
}) {
  const kind = kindOverride ?? kindOf(files);
  const [o, setO] = useState<Opts>(() => ({ ...defaultOpts, ...initialOpts }));
  const [res, setRes] = useState<FormatResult | null>(null);
  const [previousSize, setPreviousSize] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const requestId = useRef(0);
  const lastSize = useRef<number | null>(null);
  const set = (p: Partial<Opts>) => {
    requestId.current += 1;
    setBusy(true);
    setErr("");
    setRes(null);
    setO((current) => ({ ...current, ...p }));
  };
  const run = useCallback(async (options: Opts = o) => {
    if (!kind) return;
    const id = ++requestId.current;
    setBusy(true);
    setErr("");
    try {
      const next = await compressFormat(kind, files, options);
      if (id !== requestId.current) {
        if (next.origUrl) URL.revokeObjectURL(next.origUrl);
        if (next.previewUrl) URL.revokeObjectURL(next.previewUrl);
        return;
      }
      setPreviousSize(lastSize.current);
      lastSize.current = next.data.length;
      setRes(next);
    } catch (e) {
      if (id === requestId.current) setErr(e instanceof Error ? e.message : String(e));
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }, [files, kind, o]);

  useEffect(() => {
    requestId.current += 1;
    lastSize.current = null;
    setPreviousSize(null);
  }, [files]);

  useEffect(() => {
    if (!kind) return;
    const timer = setTimeout(() => { void run(o); }, 250);
    return () => clearTimeout(timer);
  }, [kind, o, run]);

  useEffect(() => () => { requestId.current += 1; }, []);

  useEffect(() => {
    if (!res) return;
    return () => {
      if (res.origUrl) URL.revokeObjectURL(res.origUrl);
      if (res.previewUrl) URL.revokeObjectURL(res.previewUrl);
    };
  }, [res]);

  if (!kind) return null;

  const info = KINDS[kind];
  const total = files.reduce((s, f) => s + f.bytes.length, 0);
  const download = () => {
    if (!res) return;
    const base = files.length > 1 ? "archive" : files[0].name.replace(/\.[^.]+$/, "");
    const a = document.createElement("a");
    const url = URL.createObjectURL(new Blob([res.data as BlobPart], { type: res.mime }));
    a.href = url;
    a.download = `${base}-compressed.${res.ext}`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const saved = res ? (total ? (1 - res.data.length / total) * 100 : 0) : 0;
  const change = res && previousSize !== null ? ((res.data.length - previousSize) / Math.max(1, previousSize)) * 100 : null;

  return (
    <section className="panel format-panel" aria-busy={busy}>
      <div className="format-head">
        <div>
          <p className="sec-label lbl"><b>04</b> / Format-aware</p>
          <h2>{info.label}</h2>
        </div>
        <span className="lbl" role="status">{busy ? "Updating preview…" : res ? "Live preview" : "Ready"}</span>
      </div>
      <div className="opts">
        {kind === "image" && (<>
          <label>Output format
            <select value={o.imageFormat} onChange={(e) => set({ imageFormat: e.target.value as Opts["imageFormat"] })}>
              <option value="webp">WebP</option><option value="jpeg">JPEG</option><option value="png">PNG (palette)</option>
            </select>
          </label>
          {o.imageFormat === "png" ? (
            <label>Colours: {o.colors >= 256 ? "lossless" : o.colors}
              <input type="range" min={2} max={256} step={2} value={o.colors} onChange={(e) => set({ colors: +e.target.value })} />
            </label>
          ) : (
            <label>Quality: {o.quality}
              <input type="range" min={10} max={100} value={o.quality} onChange={(e) => set({ quality: +e.target.value })} />
            </label>
          )}
          <label>Max width
            <select value={o.maxWidth} onChange={(e) => set({ maxWidth: +e.target.value })}>
              <option value={0}>Original</option><option value={2400}>2400 px</option><option value={1600}>1600 px</option>
              <option value={1200}>1200 px</option><option value={800}>800 px</option>
            </select>
          </label>
        </>)}
        {kind === "pdf" && (
          <label className="check"><input type="checkbox" checked={o.stripMeta} onChange={(e) => set({ stripMeta: e.target.checked })} /> Remove metadata (title, author, producer)</label>
        )}
        {kind === "audio" && (
          <label>MP3 bitrate
            <select value={o.bitrate} onChange={(e) => set({ bitrate: +e.target.value })}>
              {[64, 96, 128, 192].map((b) => <option key={b} value={b}>{b} kbps</option>)}
            </select>
          </label>
        )}
        {(kind === "zip" || kind === "text") && (
          <label>{kind === "zip" ? "Deflate level" : "GZIP level"}: {o.level}
            <input type="range" min={1} max={9} value={o.level} onChange={(e) => set({ level: +e.target.value })} />
          </label>
        )}
        <button className="pill dark" onClick={() => { void run(); }} disabled={busy}>{busy ? "Updating…" : kind === "zip" ? "Create ZIP" : "Compress"}</button>
      </div>
      {err && <p className="error" role="alert">{err}</p>}
      {res && (
        <div className="fresult">
          <div className="summary">
            <div><span className="k">Original</span><b className="v">{fmtBytes(total)}</b></div>
            <div>
              <span className="k">Compressed</span>
              <b className="v">{fmtBytes(res.data.length)}</b>
              <small>{change === null ? "Initial settings" : change === 0 ? "No size change" : `${Math.abs(change).toFixed(1)}% ${change < 0 ? "smaller" : "larger"} vs previous`}</small>
            </div>
            <div><span className="k">Ratio</span><b className="v">{(total / Math.max(1, res.data.length)).toFixed(2)} : 1</b></div>
            <div><span className="k">{saved >= 0 ? "Saved" : "Grew by"}</span><b className={"v" + (saved < 0 ? " neg" : "")}>{Math.abs(saved).toFixed(1)}%</b></div>
          </div>
          <p className="format-meta">{res.ext.toUpperCase()} · {res.ms < 1 ? "<1" : res.ms.toFixed(0)} ms</p>
          {res.previewUrl && res.origUrl && (
            <div className="previews">
              <figure><img src={res.origUrl} alt="Original" /><figcaption>Original</figcaption></figure>
              <figure><img src={res.previewUrl} alt="Compressed" /><figcaption>Compressed</figcaption></figure>
            </div>
          )}
          <button className="pill light" onClick={download}>Download .{res.ext}</button>
        </div>
      )}
    </section>
  );
}
