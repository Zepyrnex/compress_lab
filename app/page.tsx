"use client";
import { useRef, useState } from "react";
import { AlgoResult, HNode, buildCodes, buildTree, countFreq, runAll, symLabel } from "@/lib/compress";
import { FileInfo, detectType, entropy, fmtBytes as fmt } from "@/lib/analyze";
import { Item } from "@/lib/formats";
import HuffmanTree from "@/components/HuffmanTree";
import FormatLab from "@/components/FormatLab";

const MAX = 25 * 1024 * 1024;
const enc = (s: string) => new TextEncoder().encode(s);
const FORMATS = ["JPG", "PNG", "WEBP", "GIF", "AVIF", "PDF", "SVG", "JSON", "CSS", "JS", "HTML", "WAV", "MP3", "ZIP", "TXT"];

const SAMPLES: { label: string; name: string; make: () => Uint8Array }[] = [
  { label: "ABRACADABRA", name: "abracadabra.txt", make: () => enc("ABRACADABRA") },
  { label: "Repeated text", name: "repeated.txt", make: () => enc("Data structures make compression possible. ".repeat(200)) },
  { label: "One letter", name: "same-letter.txt", make: () => enc("a".repeat(5000)) },
  { label: "Random bytes", name: "random.bin", make: () => crypto.getRandomValues(new Uint8Array(8000)) },
];

interface Row { byte: number; freq: number; pct: number; code: string; }
interface Data {
  bytes: Uint8Array; name: string; size: number; info: FileInfo; unique: number; entropy: number;
  results: AlgoResult[]; rows: Row[]; steps: string[]; root: HNode | null; simplified: boolean;
}

const ms = (n: number) => (n < 1 ? "<1 ms" : `${n.toFixed(n < 10 ? 1 : 0)} ms`);

function analyse(bytes: Uint8Array, name: string): Data {
  const freq = countFreq(bytes);
  const codes = buildCodes(buildTree(freq));
  const syms = Array.from({ length: 256 }, (_, b) => b).filter((b) => freq[b] > 0).sort((a, b) => freq[b] - freq[a]);
  const simplified = syms.length > 14;
  const vis = new Uint32Array(256);
  (simplified ? syms.slice(0, 12) : syms).forEach((b) => (vis[b] = freq[b]));
  const steps: string[] = [];
  const root = buildTree(vis, steps);
  return {
    bytes, name, size: bytes.length, info: detectType(name, bytes), unique: syms.length,
    entropy: entropy(freq, bytes.length), results: runAll(bytes),
    rows: syms.slice(0, 10).map((b) => ({ byte: b, freq: freq[b], pct: (freq[b] / bytes.length) * 100, code: codes[b] })),
    steps, root, simplified,
  };
}

export default function Home() {
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [drag, setDrag] = useState(false);
  const [multi, setMulti] = useState<Item[] | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const process = (bytes: Uint8Array, name: string) => {
    if (bytes.length > MAX) { setError("This demo handles files up to 25 MB. Pick a smaller file."); return; }
    setBusy(true); setError(""); setMulti(null);
    setTimeout(() => {
      try { setData(analyse(bytes, name)); }
      catch (e) { setError("Something went wrong while compressing: " + String(e)); }
      finally { setBusy(false); }
    }, 30);
  };
  const onFiles = async (list?: FileList | null) => {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    if (files.reduce((n, f) => n + f.size, 0) > MAX) { setError("This demo handles up to 25 MB in total. Pick smaller files."); return; }
    if (files.length === 1) { process(new Uint8Array(await files[0].arrayBuffer()), files[0].name); return; }
    const items = await Promise.all(files.map(async (f) => ({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) })));
    setError(""); setData(null); setMulti(items);
  };
  const download = (r: AlgoResult) => {
    const url = URL.createObjectURL(new Blob([r.data as BlobPart]));
    const a = document.createElement("a");
    a.href = url; a.download = `${data!.name}.${r.ext}`; a.click();
    URL.revokeObjectURL(url);
  };

  const best = data ? data.results.reduce((a, b) => (b.data.length < a.data.length ? b : a)) : null;
  const gain = !!data && !!best && best.data.length < data.size;

  return (
    <main className="wrap">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><i className="dash" />Compress · Compare · Visualize</p>
          <h1 className="glitch">
            <span className="dim">Compression you can see</span> for text, images, PDFs, audio and archives.
          </h1>
          <p className="lead">Upload a file, compare RLE, Huffman, LZSS and Deflate, then squeeze it further with real image, PDF, audio and code libraries.</p>
          <div className="cta">
            <button className="pill dark" onClick={() => input.current?.click()}>Choose a file</button>
            <button className="pill light" onClick={() => process(enc("ABRACADABRA"), "abracadabra.txt")}>Try ABRACADABRA</button>
          </div>
        </div>
        <label
          className={"drop" + (drag ? " drag" : "")}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files); }}
        >
          <input ref={input} type="file" multiple hidden onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
          <strong>Drop files here</strong>
          <span>or click to browse. Pick several files to bundle them into a ZIP. Up to 25 MB, processed in your browser.</span>
        </label>
      </section>
      <div className="lime-bar" aria-hidden />
      <div className="marquee" aria-hidden>
        <div>{[0, 1].map((k) => FORMATS.map((f) => <b key={k + f}>{f}</b>))}</div>
      </div>

      <section className="panel input-row">
        <div className="samples">
          <span className="hint">Samples:</span>
          {SAMPLES.map((s) => (
            <button key={s.label} className="chip" onClick={() => process(s.make(), s.name)}>{s.label}</button>
          ))}
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Or type some text here…" />
        <button className="pill dark" disabled={!text} onClick={() => process(enc(text), "typed-text.txt")}>Compress text</button>
      </section>

      {error && <p className="error" role="alert">{error}</p>}
      {busy && <p className="busy">Compressing…</p>}

      {!data && !multi && !busy && (
        <p className="empty">Nothing compressed yet. Upload a file or pick a sample to see the results.</p>
      )}

      {multi && <FormatLab key={multi.map((f) => f.name).join()} files={multi} />}

      {data && best && (
        <>
          <section className="panel summary">
            <div><span className="k">File</span><b className="v name">{data.name}</b><small>{data.info.label}</small></div>
            <div><span className="k">Original size</span><b className="v">{fmt(data.size)}</b></div>
            <div><span className="k">Best result</span><b className="v">{gain ? fmt(best.data.length) : "No gain"}</b><small>{best.algo}</small></div>
            <div><span className="k">Compression ratio</span><b className="v">{best.ratio.toFixed(2)} : 1</b><small>{gain ? `${best.saved.toFixed(1)}% smaller` : "Output is not smaller"}</small></div>
          </section>

          <section className="panel">
            <h2 className="glitch">Comparison</h2>
            <div className="scroll">
              <table>
                <thead>
                  <tr><th>Method</th><th>Size vs original</th><th>Compressed</th><th>Ratio</th><th>Saved</th><th>Compress</th><th>Decompress</th><th>Lossless</th><th /></tr>
                </thead>
                <tbody>
                  {data.results.map((r) => {
                    const pct = data.size ? (r.data.length / data.size) * 100 : 0;
                    return (
                      <tr key={r.algo} className={r === best && gain ? "best" : ""}>
                        <td><b>{r.algo}</b>{r.algo === "Deflate" && <small className="lib"> fflate</small>}{r === best && gain && <em className="tag">best</em>}</td>
                        <td className="barcell">
                          <div className="bar"><i className={pct > 100 ? "over" : ""} style={{ width: Math.min(pct, 100) + "%" }} /></div>
                          <small>{pct.toFixed(0)}%</small>
                        </td>
                        <td>{fmt(r.data.length)}</td>
                        <td>{r.ratio.toFixed(2)} : 1</td>
                        <td className={r.saved < 0 ? "neg" : ""}>{r.saved.toFixed(1)}%</td>
                        <td>{ms(r.encMs)}</td>
                        <td>{ms(r.decMs)}</td>
                        <td>{r.lossless ? "Verified" : "Mismatch"}</td>
                        <td><button className="chip" onClick={() => download(r)}>Download .{r.ext}</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="note">
              {gain
                ? `${best.algo} gives the smallest output for this file. Each result is decompressed and checked byte by byte against the original.`
                : "None of the methods made this file smaller. Rows above 100% mean the output grew, which happens with already-compressed or random-looking data."}
            </p>
          </section>

          <FormatLab key={data.name + data.size} files={[{ name: data.name, bytes: data.bytes }]} />

          <section className="panel two">
            <div>
              <h2 className="glitch">File analysis</h2>
              <dl>
                <dt>Detected type</dt><dd>{data.info.label}</dd>
                <dt>Distinct byte values</dt><dd>{data.unique} of 256</dd>
                <dt>Entropy</dt><dd>{data.entropy.toFixed(2)} bits per byte (8 means random)</dd>
                <dt>Symbol-coding limit</dt><dd>≈ {fmt(Math.ceil((data.entropy * data.size) / 8))} using byte frequencies alone</dd>
              </dl>
              <p className="tip">{data.info.tip}</p>
            </div>
            <div>
              <h2 className="glitch">Most frequent symbols</h2>
              <table className="small">
                <thead><tr><th>Symbol</th><th>Count</th><th>Share</th><th>Huffman code</th></tr></thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.byte}>
                      <td><code>{symLabel(r.byte)}</code></td><td>{r.freq}</td><td>{r.pct.toFixed(1)}%</td>
                      <td><code className="bits">{r.code}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="note">Frequent symbols get shorter codes. That is where Huffman saves space.</p>
            </div>
          </section>

          {data.root && (
            <section className="panel">
              <h2 className="glitch">How the Huffman tree is built</h2>
              <p className="note">
                {data.simplified
                  ? `Simplified view: the 12 most frequent of ${data.unique} symbols. The real tree has ${data.unique} leaves.`
                  : "Full tree for this file. Left edge = 0, right edge = 1."}
              </p>
              <div className="two tree-row">
                <ol className="steps" start={0}>
                  <li className="steps-title">Min heap merges the two lowest counts each time:</li>
                  {data.steps.length === 0 && <li>Only one symbol, so the tree is a single leaf (code 0).</li>}
                  {data.steps.slice(0, 20).map((s, i) => <li key={i}>{s}</li>)}
                  {data.steps.length > 20 && <li>…and {data.steps.length - 20} more merges</li>}
                </ol>
                <HuffmanTree root={data.root} />
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
