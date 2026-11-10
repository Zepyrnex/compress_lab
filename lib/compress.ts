// Compression algorithms written from scratch (no libraries) for the demo.
import { deflateSync, inflateSync } from "fflate";
export type AlgoName = "RLE" | "Huffman" | "LZSS" | "Deflate";

export interface HNode {
  id: number;
  freq: number;
  byte?: number; // set on leaves only
  left?: HNode;
  right?: HNode;
}

/** Min Heap / priority queue: always gives the lowest-frequency node. */
class MinHeap {
  private a: HNode[] = [];
  get size() { return this.a.length; }
  private less(x: HNode, y: HNode) { return x.freq < y.freq || (x.freq === y.freq && x.id < y.id); }
  push(n: HNode) {
    const a = this.a; a.push(n);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]]; i = p;
    }
  }
  pop(): HNode {
    const a = this.a, top = a[0], last = a.pop()!;
    if (a.length) {
      a[0] = last; let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]]; i = m;
      }
    }
    return top;
  }
}

export function symLabel(b: number): string {
  if (b === 32) return "space";
  if (b === 10) return "\\n";
  if (b === 13) return "\\r";
  if (b === 9) return "\\t";
  if (b > 32 && b < 127) return String.fromCharCode(b);
  return "0x" + b.toString(16).toUpperCase().padStart(2, "0");
}

/** Hash Map / frequency table: byte -> count */
export function countFreq(src: Uint8Array): Uint32Array {
  const f = new Uint32Array(256);
  for (let i = 0; i < src.length; i++) f[src[i]]++;
  return f;
}

/** Greedy Huffman tree build. `steps` (optional) records each merge for the visualiser. */
export function buildTree(freq: Uint32Array, steps?: string[]): HNode | null {
  const heap = new MinHeap(); let id = 0;
  for (let b = 0; b < 256; b++) if (freq[b]) heap.push({ id: id++, freq: freq[b], byte: b });
  if (heap.size === 0) return null;
  const lab = (n: HNode) => (n.byte !== undefined ? `${symLabel(n.byte)}(${n.freq})` : `[${n.freq}]`);
  while (heap.size > 1) {
    const a = heap.pop(), b = heap.pop();
    const n: HNode = { id: id++, freq: a.freq + b.freq, left: a, right: b };
    steps?.push(`${lab(a)} + ${lab(b)} → ${n.freq}`);
    heap.push(n);
  }
  return heap.pop();
}

/** Binary tree traversal -> dictionary byte -> code string ("0"/"1") */
export function buildCodes(root: HNode | null): string[] {
  const codes: string[] = new Array(256).fill("");
  const walk = (n: HNode, p: string) => {
    if (n.byte !== undefined) { codes[n.byte] = p || "0"; return; }
    walk(n.left!, p + "0"); walk(n.right!, p + "1");
  };
  if (root) walk(root, "");
  return codes;
}

/* ---------- RLE: (count, byte) pairs ---------- */
export function rleEncode(src: Uint8Array): Uint8Array {
  const out = new Uint8Array(src.length * 2);
  let o = 0, i = 0;
  while (i < src.length) {
    const b = src[i]; let n = 1;
    while (i + n < src.length && src[i + n] === b && n < 255) n++;
    out[o++] = n; out[o++] = b; i += n;
  }
  return out.slice(0, o);
}
export function rleDecode(src: Uint8Array): Uint8Array {
  let total = 0;
  for (let i = 0; i < src.length; i += 2) total += src[i];
  const out = new Uint8Array(total); let o = 0;
  for (let i = 0; i < src.length; i += 2) { out.fill(src[i + 1], o, o + src[i]); o += src[i]; }
  return out;
}

/* ---------- Huffman: header (length + frequency table) + bit stream ---------- */
export function huffmanEncode(src: Uint8Array): Uint8Array {
  const freq = countFreq(src);
  const codes = buildCodes(buildTree(freq));
  const syms: number[] = []; let bits = 0;
  for (let b = 0; b < 256; b++) if (freq[b]) { syms.push(b); bits += freq[b] * codes[b].length; }
  const head = 6 + syms.length * 5;
  const out = new Uint8Array(head + Math.ceil(bits / 8));
  const dv = new DataView(out.buffer);
  dv.setUint32(0, src.length); dv.setUint16(4, syms.length);
  syms.forEach((b, k) => { out[6 + k * 5] = b; dv.setUint32(7 + k * 5, freq[b]); });
  let o = head, acc = 0, nb = 0;
  for (let i = 0; i < src.length; i++) {
    const c = codes[src[i]];
    for (let k = 0; k < c.length; k++) {
      acc = (acc << 1) | (c.charCodeAt(k) - 48);
      if (++nb === 8) { out[o++] = acc; acc = 0; nb = 0; }
    }
  }
  if (nb > 0) out[o++] = acc << (8 - nb);
  return out;
}
export function huffmanDecode(src: Uint8Array): Uint8Array {
  const dv = new DataView(src.buffer, src.byteOffset, src.byteLength);
  const len = dv.getUint32(0), n = dv.getUint16(4);
  const out = new Uint8Array(len);
  if (n === 0 || len === 0) return out;
  const freq = new Uint32Array(256);
  for (let k = 0; k < n; k++) freq[src[6 + k * 5]] = dv.getUint32(7 + k * 5);
  const root = buildTree(freq)!;
  if (root.byte !== undefined) { out.fill(root.byte); return out; }
  let node = root, p = 0;
  for (let i = 6 + n * 5; i < src.length && p < len; i++) {
    for (let bit = 7; bit >= 0; bit--) {
      node = ((src[i] >> bit) & 1 ? node.right : node.left)!;
      if (node.byte !== undefined) { out[p++] = node.byte; node = root; if (p === len) break; }
    }
  }
  return out;
}

/* ---------- LZSS (LZ77 family): sliding window, 12-bit offset, length 3..18 ---------- */
export function lzssEncode(src: Uint8Array): Uint8Array {
  const n = src.length;
  const out = new Uint8Array(4 + n + Math.ceil(n / 8) + 8);
  new DataView(out.buffer).setUint32(0, n);
  const head = new Int32Array(1 << 15).fill(-1);
  const hash = (i: number) => ((src[i] << 10) ^ (src[i + 1] << 5) ^ src[i + 2]) & 0x7fff;
  let o = 4, i = 0, cnt = 0, flagPos = 0;
  while (i < n) {
    if (cnt === 0) { flagPos = o++; out[flagPos] = 0; }
    let len = 0, off = 0;
    if (i + 2 < n) {
      const c = head[hash(i)];
      if (c >= 0 && i - c < 4096) {
        while (len < 18 && i + len < n && src[c + len] === src[i + len]) len++;
        off = i - c;
      }
    }
    let step = 1;
    if (len >= 3) {
      out[flagPos] |= 1 << cnt;
      out[o++] = (off >> 4) & 0xff; out[o++] = ((off & 15) << 4) | (len - 3);
      step = len;
    } else out[o++] = src[i];
    for (let k = 0; k < step; k++) if (i + k + 2 < n) head[hash(i + k)] = i + k;
    i += step;
    cnt = (cnt + 1) & 7;
  }
  return out.slice(0, o);
}
export function lzssDecode(src: Uint8Array): Uint8Array {
  const n = new DataView(src.buffer, src.byteOffset, src.byteLength).getUint32(0);
  const out = new Uint8Array(n);
  let i = 4, p = 0;
  while (p < n && i < src.length) {
    const flags = src[i++];
    for (let bit = 0; bit < 8 && p < n && i < src.length; bit++) {
      if (flags & (1 << bit)) {
        const off = (src[i] << 4) | (src[i + 1] >> 4), len = (src[i + 1] & 15) + 3; i += 2;
        for (let k = 0; k < len && p < n; k++, p++) out[p] = out[p - off];
      } else out[p++] = src[i++];
    }
  }
  return out;
}

/* ---------- Benchmark all algorithms ---------- */
export interface AlgoResult {
  algo: AlgoName; ext: string; data: Uint8Array;
  ratio: number; saved: number; encMs: number; decMs: number; lossless: boolean;
}
const ALGOS = [
  { algo: "RLE" as AlgoName, ext: "rle", enc: rleEncode, dec: rleDecode },
  { algo: "Huffman" as AlgoName, ext: "huf", enc: huffmanEncode, dec: huffmanDecode },
  { algo: "LZSS" as AlgoName, ext: "lzss", enc: lzssEncode, dec: lzssDecode },
  // Industry standard (LZ77 + Huffman) from the fflate library, for comparison with our own code
  { algo: "Deflate" as AlgoName, ext: "deflate", enc: (s: Uint8Array) => deflateSync(s, { level: 9 }), dec: (d: Uint8Array) => inflateSync(d) },
];
function same(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
export function runAll(src: Uint8Array): AlgoResult[] {
  return ALGOS.map(({ algo, ext, enc, dec }) => {
    let t = performance.now();
    const data = enc(src);
    const encMs = performance.now() - t;
    t = performance.now();
    const back = dec(data);
    const decMs = performance.now() - t;
    return {
      algo, ext, data, encMs, decMs,
      ratio: data.length ? src.length / data.length : 1,
      saved: src.length ? (1 - data.length / src.length) * 100 : 0,
      lossless: same(src, back),
    };
  });
}
