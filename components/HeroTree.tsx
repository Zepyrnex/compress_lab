import type { CSSProperties } from "react";

/** Decorative Huffman tree for "ABRACADABRA" (A 5, R 2, B 2, C 1, D 1) shown in the hero. */
const N = {
  root: [150, 28], A: [75, 100], n6: [225, 100], R: [180, 172], n4: [270, 172], B: [225, 244], n2: [315, 244], C: [280, 316], D: [350, 316],
} as Record<string, number[]>;
const EDGES: [string, string, string][] = [
  ["root", "A", "0"], ["root", "n6", "1"], ["n6", "R", "0"], ["n6", "n4", "1"], ["n4", "B", "0"], ["n4", "n2", "1"], ["n2", "C", "0"], ["n2", "D", "1"],
];
const LEAF: Record<string, [string, number]> = { A: ["A", 5], R: ["R", 2], B: ["B", 2], C: ["C", 1], D: ["D", 1] };
const CNT: Record<string, number> = { root: 11, n6: 6, n4: 4, n2: 2 };

export default function HeroTree() {
  return (
    <svg viewBox="0 0 400 350" role="img" aria-label="Huffman tree for ABRACADABRA" preserveAspectRatio="xMidYMid meet">
      {EDGES.map(([a, b, bit], i) => {
        const [x1, y1] = N[a], [x2, y2] = N[b];
        return (
          <g key={a + b}>
            <line className="ft-edge" style={{ "--i": i } as CSSProperties} x1={x1} y1={y1} x2={x2} y2={y2} />
            <text className="ft-bit" x={(x1 + x2) / 2 + (bit === "0" ? -10 : 10)} y={(y1 + y2) / 2 + 3}>{bit}</text>
          </g>
        );
      })}
      {Object.keys(N).map((k) => {
        const [x, y] = N[k];
        const leaf = LEAF[k];
        return leaf ? (
          <g key={k}>
            <rect className="ft-node ft-leaf" x={x - 20} y={y - 18} width={40} height={36} />
            <text className="ft-txt on" x={x} y={y - 2}>{leaf[0]}</text>
            <text className="ft-txt on" x={x} y={y + 12} style={{ fontSize: 10, opacity: 0.85 }}>{leaf[1]}</text>
          </g>
        ) : (
          <g key={k}>
            <circle className="ft-node" cx={x} cy={y} r={17} />
            <text className="ft-txt" x={x} y={y + 4}>{CNT[k]}</text>
          </g>
        );
      })}
    </svg>
  );
}
