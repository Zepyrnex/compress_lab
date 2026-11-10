"use client";
import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import FormatLab from "@/components/FormatLab";
import { Item, Kind } from "@/lib/formats";

interface FormatOption {
  id: string;
  supported: boolean;
  reason?: string;
  outputKind?: Kind;
}

interface FormatGroup {
  name: string;
  description: string;
  formats: FormatOption[];
}

const GROUPS: FormatGroup[] = [
  {
    name: "Images",
    description: "Re-encode pixels in your browser.",
    formats: [
      { id: "JPG", supported: true }, { id: "JPEG", supported: true }, { id: "PNG", supported: true },
      { id: "WEBP", supported: true }, { id: "GIF", supported: true }, { id: "BMP", supported: true },
      { id: "TIFF", supported: false, reason: "TIFF decoding is not available in the current browser pipeline." },
      { id: "AVIF", supported: true }, { id: "HEIC", supported: false, reason: "HEIC needs a separate decoder that is not included." },
      { id: "ICO", supported: false, reason: "ICO decoding is not available in the current browser pipeline." },
    ],
  },
  {
    name: "Documents",
    description: "PDF files can be rewritten and metadata removed.",
    formats: [
      { id: "PDF", supported: true }, { id: "DOCX", supported: false, reason: "Office document rewriting is not included." },
      { id: "XLSX", supported: false, reason: "Office document rewriting is not included." },
      { id: "PPTX", supported: false, reason: "Office document rewriting is not included." },
      { id: "ODT", supported: false, reason: "OpenDocument rewriting is not included." },
    ],
  },
  {
    name: "Vector",
    description: "SVG files are optimised without rasterising.",
    formats: [
      { id: "SVG", supported: true }, { id: "EPS", supported: false, reason: "EPS needs a PostScript interpreter." },
    ],
  },
  {
    name: "Code & markup",
    description: "Minify source or gzip plain text.",
    formats: [
      { id: "HTML", supported: true }, { id: "CSS", supported: true }, { id: "JS", supported: true },
      { id: "XML", supported: true }, { id: "JSON", supported: true }, { id: "TXT", supported: true },
    ],
  },
  {
    name: "Audio",
    description: "MP3 output; decoding depends on browser codec support.",
    formats: [
      { id: "MP3", supported: true }, { id: "WAV", supported: true }, { id: "OGG", supported: true },
      { id: "FLAC", supported: true }, { id: "M4A", supported: true }, { id: "AAC", supported: true },
    ],
  },
  {
    name: "Video",
    description: "Video transcoding needs a codec and muxer not included here.",
    formats: [
      { id: "MP4", supported: false, reason: "MP4 transcoding is not available in this browser-only build." },
    ],
  },
  {
    name: "Archives",
    description: "Build ZIP archives from one or more files.",
    formats: [
      { id: "Create ZIP", supported: true, outputKind: "zip" },
      { id: "ZIP", supported: false, reason: "Opening and recompressing existing ZIP archives is not included." },
      { id: "CBZ", supported: false, reason: "Comic archive editing is not included." },
    ],
  },
  {
    name: "Fonts",
    description: "Font subsetting requires a font parser.",
    formats: [
      { id: "TTF", supported: false, reason: "Font subsetting is not included." },
      { id: "OTF", supported: false, reason: "Font subsetting is not included." },
      { id: "WOFF", supported: false, reason: "Font subsetting is not included." },
      { id: "WOFF2", supported: false, reason: "Font subsetting is not included." },
    ],
  },
  {
    name: "Ebooks & 3D",
    description: "EPUB packaging and mesh rewriting are not included.",
    formats: [
      { id: "EPUB", supported: false, reason: "EPUB repackaging is not included." },
      { id: "GLB", supported: false, reason: "3D mesh optimisation is not included." },
      { id: "STL", supported: false, reason: "3D mesh optimisation is not included." },
    ],
  },
];

const EXTENSIONS: Record<string, string[]> = {
  JPG: ["jpg"], JPEG: ["jpeg"], PNG: ["png"], WEBP: ["webp"], GIF: ["gif"],
  BMP: ["bmp"], AVIF: ["avif"], PDF: ["pdf"], SVG: ["svg"], HTML: ["html", "htm"],
  CSS: ["css"], JS: ["js", "mjs"], XML: ["xml"], JSON: ["json"],
  TXT: ["txt", "text", "md", "log", "csv"],
  MP3: ["mp3"], WAV: ["wav"], OGG: ["ogg"], FLAC: ["flac"], M4A: ["m4a"], AAC: ["aac"],
};

function extensionsFor(id: string) {
  return EXTENSIONS[id] ?? [id.toLowerCase()];
}

export default function FormatCatalog() {
  const [selected, setSelected] = useState<FormatOption | null>(null);
  const [files, setFiles] = useState<Item[]>([]);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const workspace = useRef<HTMLElement>(null);
  const selectionId = useRef(0);

  useEffect(() => {
    workspace.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selected]);

  const chooseFormat = (format: FormatOption) => {
    selectionId.current += 1;
    setSelected(format);
    setFiles([]);
    setError("");
  };

  const loadFiles = async (list: FileList | File[]) => {
    const incoming = Array.from(list);
    if (!incoming.length || !selected) return;
    const requestId = selectionId.current;
    if (incoming.reduce((size, file) => size + file.size, 0) > 25 * 1024 * 1024) {
      setError("Files are limited to 25 MB total.");
      return;
    }

    const isArchiveBuilder = selected.outputKind === "zip";
    if (!isArchiveBuilder) {
      const expected = extensionsFor(selected.id);
      const invalid = incoming.find((file) => !expected.includes(file.name.split(".").pop()?.toLowerCase() ?? ""));
      if (invalid) {
        setError(`Choose a ${selected.id} file to use these settings.`);
        return;
      }
    } else if (incoming.length === 1 && incoming[0].name.toLowerCase().endsWith(".zip")) {
      setError("Choose source files, not an existing ZIP archive.");
      return;
    }

    try {
      const next = await Promise.all(incoming.map(async (file) => ({
        name: file.name,
        bytes: new Uint8Array(await file.arrayBuffer()),
      })));
      if (requestId !== selectionId.current) return;
      setFiles(next);
      setError("");
    } catch (e) {
      if (requestId !== selectionId.current) return;
      setError(`Could not read the selected file: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    void loadFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDrag(false);
    void loadFiles(Array.from(event.dataTransfer.files));
  };

  return (
    <section className="format-catalog panel" id="formats">
      <header className="catalog-heading">
        <p className="sec-label lbl"><b>08</b> / Format coverage</p>
        <h2>Choose a format to compress.</h2>
        <p>Select a format to open its settings. Unsupported formats are marked unavailable.</p>
      </header>

      <div className="format-grid">
        {GROUPS.map((group) => (
          <article className="format-card" key={group.name}>
            <h3>{group.name}</h3>
            <p>{group.description}</p>
            <div className="format-chips">
              {group.formats.map((format) => (
                <button
                  type="button"
                  className={`format-chip${selected?.id === format.id ? " selected" : ""}${format.supported ? "" : " unavailable"}`}
                  key={format.id}
                  aria-pressed={selected?.id === format.id}
                  onClick={() => chooseFormat(format)}
                  title={format.supported ? `Open ${format.id} settings` : `${format.id}: not available`}
                >
                  {format.id}
                  {!format.supported && <span className="sr-only"> (not available)</span>}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>

      {selected && (
        <section className="format-workspace" aria-labelledby="format-workspace-title" ref={workspace}>
          <div className="workspace-head">
            <div>
              <p className="sec-label lbl">Format settings</p>
              <h3 id="format-workspace-title">{selected.id}</h3>
            </div>
            <button type="button" className="chip" onClick={() => { selectionId.current += 1; setSelected(null); setFiles([]); setError(""); }}>
              Close
            </button>
          </div>

          {!selected.supported ? (
            <p className="format-unavailable" role="status">{selected.reason}</p>
          ) : files.length ? (
            <FormatLab
              key={`${selected.id}:${files.map((file) => `${file.name}:${file.bytes.length}`).join("|")}`}
              files={files}
              kindOverride={selected.outputKind}
              initialOpts={
                selected.id === "PNG" ? { imageFormat: "png" } :
                selected.id === "JPG" || selected.id === "JPEG" ? { imageFormat: "jpeg" } :
                undefined
              }
            />
          ) : (
            <>
              <label
                className={`format-file-drop${drag ? " drag" : ""}`}
                onDragOver={(event) => { event.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={onDrop}
              >
                <input
                  ref={input}
                  type="file"
                  accept={selected.outputKind === "zip" ? undefined : extensionsFor(selected.id).map((extension) => `.${extension}`).join(",")}
                  multiple={selected.outputKind === "zip"}
                  hidden
                  onChange={onChange}
                />
                <span>Choose or drop {selected.outputKind === "zip" ? "source files" : `a .${extensionsFor(selected.id)[0]} file`}</span>
                <span className="pill dark">Choose file</span>
              </label>
              {error && <p className="error" role="alert">{error}</p>}
            </>
          )}
        </section>
      )}
    </section>
  );
}
