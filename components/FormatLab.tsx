"use client";
import { useState } from "react";
import { fmtBytes } from "@/lib/analyze";
import { FormatResult, Item, KINDS, Opts, compressFormat, defaultOpts, kindOf } from "@/lib/formats";

export default function FormatLab({ files }: { files: Item[] }) {
  const kind = kindOf(files);
  const [o, setO] = useState<Opts>(defaultOpts);
  const [res, setRes] = useState<FormatResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (!kind) return null;

  const info = KINDS[kind];
  const total = files.reduce((s, f) => s + f.bytes.length, 0);
  const set = (p: Partial<Opts>) => setO({ ...o, ...p });
  const run = async () => {
    setBusy(true); setErr(""); setRes(null);
    try { setRes(await compressFormat(kind, files, o)); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };
  const download = () => {
    if (!res) return;
    const base = files.length > 1 ? "archive" : files[0].name.replace(/\.[^.]+$/, "");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([res.data as BlobPart], { type: res.mime }));
    a.download = `${base}-compressed.${res.ext}`; a.click();
  };
  const saved = res ? (1 - res.data.length / total) * 100 : 0;

  return (
    <section className="panel">
      <h2 className="glitch">Format-aware compression</h2>
      <p className="note top0">
        {info.label} detected. Library: <b>{info.lib}</b>. This goes beyond the byte-level methods above.
      </p>
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
        {kind === "zip" && (
          <label>Deflate level: {o.level}
            <input type="range" min={1} max={9} value={o.level} onChange={(e) => set({ level: +e.target.value })} />
          </label>
        )}
        <button className="pill dark" onClick={run} disabled={busy}>{busy ? "Working…" : kind === "zip" ? "Create ZIP" : "Compress"}</button>
      </div>
      {err && <p className="error" role="alert">{err}</p>}
      {res && (
        <div className="fresult">
          <div className="summary">
            <div><span className="k">Original</span><b className="v">{fmtBytes(total)}</b></div>
            <div><span className="k">Compressed</span><b className="v">{fmtBytes(res.data.length)}</b></div>
            <div><span className="k">Ratio</span><b className="v">{(total / Math.max(1, res.data.length)).toFixed(2)} : 1</b></div>
            <div><span className="k">{saved >= 0 ? "Saved" : "Grew by"}</span><b className={"v" + (saved < 0 ? " neg" : "")}>{Math.abs(saved).toFixed(1)}%</b></div>
          </div>
          <p className="note">{res.note} Done in {res.ms < 1 ? "<1" : res.ms.toFixed(0)} ms.</p>
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
