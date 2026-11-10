// Format-aware compression using real libraries (all run in the browser).
import type { ZipOptions } from "fflate";
import UPNG from "upng-js";

export type Kind = "image" | "pdf" | "svg" | "js" | "css" | "json" | "markup" | "text" | "audio" | "zip";
export interface Item { name: string; bytes: Uint8Array }
export interface Opts {
  imageFormat: "webp" | "jpeg" | "png"; quality: number; colors: number; maxWidth: number;
  bitrate: number; level: number; stripMeta: boolean;
}
export const defaultOpts: Opts = {
  imageFormat: "webp", quality: 75, colors: 64, maxWidth: 0, bitrate: 128, level: 9, stripMeta: true,
};
export interface FormatResult {
  data: Uint8Array; ext: string; mime: string; note: string; ms: number; origUrl?: string; previewUrl?: string;
}

export const KINDS: Record<Kind, { label: string; lib: string }> = {
  image: { label: "Image", lib: "Canvas encoder + upng-js" },
  pdf: { label: "PDF document", lib: "pdf-lib" },
  svg: { label: "SVG vector", lib: "svgo" },
  js: { label: "JavaScript", lib: "terser" },
  css: { label: "CSS", lib: "csso" },
  json: { label: "JSON", lib: "JSON.parse + stringify" },
  markup: { label: "HTML / XML", lib: "built-in whitespace stripper" },
  text: { label: "Text file", lib: "fflate (GZIP)" },
  audio: { label: "Audio", lib: "Web Audio + lamejs (MP3)" },
  zip: { label: "Several files → ZIP", lib: "fflate" },
};

const MIME: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
  gif: "image/gif", bmp: "image/bmp", avif: "image/avif",
};
const ext = (n: string) => (n.split(".").pop() || "").toLowerCase();
const text = (b: Uint8Array) => new TextDecoder().decode(b);
const bytes = (s: string) => new TextEncoder().encode(s);
const url = (b: Uint8Array, t: string) => URL.createObjectURL(new Blob([b as BlobPart], { type: t }));

export function kindOf(files: Item[]): Kind | null {
  if (files.length > 1) return "zip";
  if (!files.length) return null;
  const e = ext(files[0].name);
  if (MIME[e]) return "image";
  if (e === "pdf") return "pdf";
  if (e === "svg") return "svg";
  if (e === "js" || e === "mjs") return "js";
  if (e === "css") return "css";
  if (e === "json") return "json";
  if (["html", "htm", "xml"].includes(e)) return "markup";
  if (["txt", "text", "md", "log", "csv"].includes(e)) return "text";
  if (["wav", "mp3", "ogg", "flac", "m4a", "aac"].includes(e)) return "audio";
  return null;
}

type Out = Omit<FormatResult, "ms">;

async function image(f: Item, o: Opts): Promise<Out> {
  const type = MIME[ext(f.name)] || "image/png";
  const bmp = await createImageBitmap(new Blob([f.bytes as BlobPart], { type }));
  const s = o.maxWidth && bmp.width > o.maxWidth ? o.maxWidth / bmp.width : 1;
  const w = Math.max(1, Math.round(bmp.width * s)), h = Math.max(1, Math.round(bmp.height * s));
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  if (o.imageFormat === "jpeg") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); }
  ctx.drawImage(bmp, 0, 0, w, h);
  let data: Uint8Array, mime: string, e: string, note: string;
  if (o.imageFormat === "png") {
    const px = ctx.getImageData(0, 0, w, h);
    const png = UPNG.encode([px.data.buffer as ArrayBuffer], w, h, o.colors >= 256 ? 0 : o.colors);
    data = new Uint8Array(png); mime = "image/png"; e = "png";
    note = o.colors >= 256 ? "Lossless PNG re-encode." : `Palette reduced to ${o.colors} colours with upng-js.`;
  } else {
    mime = o.imageFormat === "jpeg" ? "image/jpeg" : "image/webp"; e = o.imageFormat === "jpeg" ? "jpg" : "webp";
    const blob = await new Promise<Blob | null>((res) => c.toBlob(res, mime, o.quality / 100));
    if (!blob || blob.type !== mime) throw new Error(`This browser can't encode ${e.toUpperCase()}. Try JPEG or PNG.`);
    data = new Uint8Array(await blob.arrayBuffer()); note = `Re-encoded at quality ${o.quality}.`;
  }
  note += " Metadata is dropped." + (ext(f.name) === "gif" ? " Animated GIFs keep only the first frame." : "");
  return { data, ext: e, mime, note, origUrl: url(f.bytes, type), previewUrl: url(data, mime) };
}

async function pdf(f: Item, o: Opts): Promise<Out> {
  const { PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.load(f.bytes, { updateMetadata: false });
  if (o.stripMeta) {
    doc.setTitle(""); doc.setAuthor(""); doc.setSubject(""); doc.setKeywords([]);
    doc.setProducer(""); doc.setCreator("");
  }
  const data = await doc.save({ useObjectStreams: true });
  return {
    data, ext: "pdf", mime: "application/pdf",
    note: "Re-saved with object streams" + (o.stripMeta ? " and metadata removed." : ".") +
      " Scanned or image-heavy PDFs need image downsampling, which this demo does not do.",
  };
}

async function code(kind: Kind, f: Item): Promise<Out> {
  const src = text(f.bytes); let out = src, mime = "text/plain", e = ext(f.name), note = "";
  if (kind === "js") {
    const { minify } = await import("terser");
    const r = await minify(src, { compress: true, mangle: true });
    out = r.code ?? src; mime = "text/javascript"; note = "Minified and mangled with terser.";
  } else if (kind === "css") {
    const csso = await import("csso");
    out = csso.minify(src).css; mime = "text/css"; note = "Restructured and minified with csso.";
  } else if (kind === "json") {
    out = JSON.stringify(JSON.parse(src)); mime = "application/json"; note = "Whitespace removed. Values untouched.";
  } else if (kind === "svg") {
    const { optimize } = await import("svgo/browser");
    out = optimize(src, { multipass: true }).data; mime = "image/svg+xml"; note = "Optimised with svgo.";
  } else {
    out = src.replace(/<!--[\s\S]*?-->/g, "").replace(/>\s+</g, "><").replace(/\s{2,}/g, " ").trim();
    mime = "text/html"; note = "Comments and extra whitespace removed (pre/script blocks are not protected).";
  }
  const data = bytes(out);
  return { data, ext: e, mime, note, previewUrl: kind === "svg" ? url(data, mime) : undefined, origUrl: kind === "svg" ? url(f.bytes, mime) : undefined };
}

async function audio(f: Item, o: Opts): Promise<Out> {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  const buf = await ctx.decodeAudioData(f.bytes.slice().buffer as ArrayBuffer);
  ctx.close();
  const { Mp3Encoder } = await import("@breezystack/lamejs");
  const ch = Math.min(buf.numberOfChannels, 2);
  const pcm = (i: number) => {
    const x = buf.getChannelData(i), out = new Int16Array(x.length);
    for (let k = 0; k < x.length; k++) { const v = Math.max(-1, Math.min(1, x[k])); out[k] = v < 0 ? v * 0x8000 : v * 0x7fff; }
    return out;
  };
  const L = pcm(0), R = ch > 1 ? pcm(1) : undefined;
  const enc = new Mp3Encoder(ch, buf.sampleRate, o.bitrate);
  const parts: Uint8Array[] = []; let len = 0;
  const add = (c: Uint8Array) => { if (c.length) { parts.push(new Uint8Array(c)); len += c.length; } };
  for (let i = 0; i < L.length; i += 1152)
    add(R ? enc.encodeBuffer(L.subarray(i, i + 1152), R.subarray(i, i + 1152)) : enc.encodeBuffer(L.subarray(i, i + 1152)));
  add(enc.flush());
  const data = new Uint8Array(len); let p = 0;
  for (const c of parts) { data.set(c, p); p += c.length; }
  return { data, ext: "mp3", mime: "audio/mpeg", note: `Lossy MP3 at ${o.bitrate} kbps, ${ch === 1 ? "mono" : "stereo"}.` };
}

async function zip(files: Item[], o: Opts): Promise<Out> {
  const { zipSync } = await import("fflate");
  const obj: Record<string, Uint8Array> = Object.create(null);
  files.forEach((f, index) => {
    const name = f.name || `file-${index + 1}`;
    const dot = name.lastIndexOf(".");
    const stem = dot > 0 ? name.slice(0, dot) : name;
    const suffix = dot > 0 ? name.slice(dot) : "";
    let uniqueName = name;
    let duplicate = 2;
    while (Object.hasOwn(obj, uniqueName)) uniqueName = `${stem} (${duplicate++})${suffix}`;
    obj[uniqueName] = f.bytes;
  });
  const data = zipSync(obj, { level: o.level as ZipOptions["level"] });
  return { data, ext: "zip", mime: "application/zip", note: `${files.length} files bundled with Deflate level ${o.level} (fflate).` };
}

async function compressTextFile(f: Item, o: Opts): Promise<Out> {
  const { gzipSync } = await import("fflate");
  return {
    data: gzipSync(f.bytes, { level: o.level as ZipOptions["level"] }),
    ext: "gz",
    mime: "application/gzip",
    note: `GZIP compressed with Deflate level ${o.level}.`,
  };
}

export async function compressFormat(kind: Kind, files: Item[], o: Opts): Promise<FormatResult> {
  const t = performance.now(), f = files[0];
  const r =
    kind === "image" ? await image(f, o) :
    kind === "pdf" ? await pdf(f, o) :
    kind === "audio" ? await audio(f, o) :
    kind === "zip" ? await zip(files, o) :
    kind === "text" ? await compressTextFile(f, o) :
    await code(kind, f);
  return { ...r, ms: performance.now() - t };
}
