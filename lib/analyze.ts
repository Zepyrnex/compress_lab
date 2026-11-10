export interface FileInfo { category: string; label: string; precompressed: boolean; tip: string; }

/** Shannon entropy in bits per byte (lower = more compressible). */
export function entropy(freq: Uint32Array, n: number): number {
  if (!n) return 0;
  let h = 0;
  for (let b = 0; b < 256; b++) if (freq[b]) { const p = freq[b] / n; h -= p * Math.log2(p); }
  return h;
}

export function detectType(name: string, b: Uint8Array): FileInfo {
  const ext = (name.split(".").pop() || "").toLowerCase();
  const starts = (...s: number[]) => s.every((v, i) => b[i] === v);
  const ascii = (o: number, s: string) => [...s].every((c, i) => b[o + i] === c.charCodeAt(0));
  const mk = (category: string, label: string, precompressed: boolean, tip: string): FileInfo =>
    ({ category, label, precompressed, tip });
  const done = "Already compressed, so lossless methods gain very little.";

  if (b.length === 0) return mk("Empty", "Empty file", false, "Nothing to compress.");
  if (starts(0x89, 0x50, 0x4e, 0x47)) return mk("Image", "PNG image", true, done + " Smaller files need lossy re-encoding (JPEG/WebP).");
  if (starts(0xff, 0xd8, 0xff)) return mk("Image", "JPEG image", true, done + " Lowering the quality setting is the way to shrink it.");
  if (ascii(0, "GIF8")) return mk("Image", "GIF image", true, done);
  if (ascii(0, "%PDF")) return mk("Document", "PDF document", true, "PDFs often contain compressed streams. Gains depend on what is inside.");
  if (starts(0x50, 0x4b, 3, 4)) return mk("Archive", "ZIP / Office file", true, done);
  if (starts(0x1f, 0x8b)) return mk("Archive", "GZIP archive", true, done);
  if (ascii(0, "ID3") || starts(0xff, 0xfb)) return mk("Audio", "MP3 audio", true, done + " Use a lower bitrate (lossy) to go smaller.");
  if (ascii(4, "ftyp")) return mk("Video", "MP4 / MOV video", true, "Video needs codecs such as H.264, H.265 or AV1 (via FFmpeg). Byte-level methods won't help.");
  if (starts(0x1a, 0x45, 0xdf, 0xa3)) return mk("Video", "WebM / MKV video", true, "Video needs codecs such as AV1 (via FFmpeg). Byte-level methods won't help.");
  if (ascii(0, "RIFF") && ascii(8, "WAVE")) return mk("Audio", "WAV audio", false, "Raw audio. Lossless methods help a little; MP3/AAC/Opus (lossy) save far more.");
  if (ascii(0, "BM") && ext === "bmp") return mk("Image", "BMP image", false, "Raw pixels have long repeated runs, so RLE and LZSS usually do well.");

  const sample = b.subarray(0, 4096); let bad = 0;
  for (let i = 0; i < sample.length; i++) { const v = sample[i]; if (v < 9 || (v > 13 && v < 32)) bad++; }
  if (bad / sample.length < 0.02)
    return mk("Text", ext ? `Text (.${ext})` : "Text", false, "Text repeats letters and words, so Huffman and LZSS usually work well.");
  return mk("Binary", "Binary file", false, "Results depend on how repetitive the data is. Compare the methods below.");
}

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(2)} KB`;
  return `${(n / 1048576).toFixed(2)} MB`;
}
