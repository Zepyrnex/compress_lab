import "./globals.css";
import type { Metadata } from "next";
import CursorField from "@/components/CursorField";
import Loader from "@/components/Loader";

export const metadata: Metadata = {
  title: "File Compression Lab",
  description: "Compare RLE, Huffman, LZSS and Deflate, compress real files, and see the Huffman tree.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Rajdhani:wght@500;600;700&display=swap"
        />
      </head>
      <body>
        <Loader />
        <div className="rail rail-l" aria-hidden><i className="hatch" /><span>File compression lab</span><i className="hatch" /></div>
        <div className="rail rail-r" aria-hidden><i className="hatch" /><span>Compress · Compare · Visualize</span><i className="hatch" /></div>
        <div className="frame">{children}</div>
        <CursorField />
      </body>
    </html>
  );
}
