import "./globals.css";
import type { Metadata, Viewport } from "next";
import CursorField from "@/components/CursorField";
import Loader from "@/components/Loader";
import Dock from "@/components/Dock";

export const metadata: Metadata = {
  title: "File Compression Lab",
  description: "Compare RLE, Huffman, LZSS and Deflate, compress real files, and see the Huffman tree.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

/* Runs before first paint so the saved (or system) theme never flashes. */
const THEME_INIT = `try{var t=localStorage.getItem("lab-theme");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="dark"}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap"
        />
      </head>
      <body>
        <Loader />
        <Dock />
        <div className="frame">{children}</div>
        <CursorField />
      </body>
    </html>
  );
}
