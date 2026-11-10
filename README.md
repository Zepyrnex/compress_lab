# File Compression Lab

Compression you can see. Drop in a file, compare four compression algorithms side by side, watch how the Huffman tree is built, then squeeze the file further with real image, PDF, audio and code libraries.

Everything runs **in your browser**. Files are never uploaded anywhere.

## Features

- **Algorithm comparison:** RLE, Huffman, LZSS and Deflate run on the same file. You get compressed size, ratio, space saved, and compress/decompress time for each.
- **Verified lossless:** every result is decompressed and checked byte by byte against the original.
- **Huffman tree visualiser:** see the min-heap merge steps, the resulting tree, and the code assigned to each frequent symbol.
- **File analysis:** detected type, distinct byte values, entropy, and the theoretical symbol-coding limit.
- **Format-aware compression:**

  | Input | What it does | Library |
  | --- | --- | --- |
  | Images | Re-encode to WebP / JPEG, or quantise PNG to a palette, with quality and max-width controls | Canvas, upng-js |
  | PDF | Rewrite the file and optionally strip metadata | pdf-lib |
  | SVG | Clean and rewrite | svgo |
  | JavaScript | Minify | terser |
  | CSS | Minify | csso |
  | JSON, HTML, XML | Strip whitespace | built-in |
  | Audio | Re-encode to MP3 at 64–192 kbps | Web Audio, lamejs |
  | Several files | Bundle into a ZIP with an adjustable Deflate level | fflate |

- **Built-in samples:** ABRACADABRA, repeated text, a single repeated letter, and random bytes, to show best and worst cases.
- **Light and dark themes** with a floating top dock, and a layout that scales from phones to 4K screens.

## Getting started

Requires Node.js 18.17 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

To build for production:

```bash
npm run build
npm start
```

## Tech stack

Next.js 14 (App Router), React 18, TypeScript. The core algorithms live in `lib/compress.ts`, and format-specific handling lives in `lib/formats.ts`.

## Project structure

```
app/          Page, layout and global styles
components/   Dock, hero, Huffman tree, format lab, loader
lib/          Compression algorithms, file analysis, format handlers
```

## Notes

- Files up to 25 MB are supported.
- Fonts (Anton, Inter, JetBrains Mono) load from Google Fonts. Without a connection the page falls back to system fonts.
- Rows above 100% in the comparison table mean the output grew. That is expected for already-compressed or random data.

## Author

Built by [Zepyrnex](https://github.com/Zepyrnex).
