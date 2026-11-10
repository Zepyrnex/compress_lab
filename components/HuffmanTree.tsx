import { HNode, symLabel } from "@/lib/compress";

interface P { node: HNode; x: number; y: number; l?: P; r?: P; }

function layout(n: HNode, d: number, c: { i: number }): P {
  if (n.byte !== undefined) return { node: n, x: c.i++, y: d };
  const l = layout(n.left!, d + 1, c), r = layout(n.right!, d + 1, c);
  return { node: n, x: (l.x + r.x) / 2, y: d, l, r };
}

export default function HuffmanTree({ root }: { root: HNode }) {
  const counter = { i: 0 };
  const tree = layout(root, 0, counter);
  const GX = 72, GY = 78, PAD = 40;
  let depth = 0;
  const measure = (p: P) => { depth = Math.max(depth, p.y); p.l && measure(p.l); p.r && measure(p.r); };
  measure(tree);
  const px = (x: number) => PAD + x * GX, py = (y: number) => 30 + y * GY;
  const edges: JSX.Element[] = [], nodes: JSX.Element[] = [];

  const draw = (p: P) => {
    const cx = px(p.x), cy = py(p.y);
    ([[p.l, "0"], [p.r, "1"]] as [P | undefined, string][]).forEach(([c, bit]) => {
      if (!c) return;
      const x2 = px(c.x), y2 = py(c.y);
      edges.push(<line key={`e${c.node.id}`} x1={cx} y1={cy} x2={x2} y2={y2} className="t-edge" />);
      edges.push(
        <text key={`b${c.node.id}`} x={(cx + x2) / 2 + (bit === "0" ? -9 : 9)} y={(cy + y2) / 2 + 4}
          className={bit === "0" ? "t-bit t-bit0" : "t-bit t-bit1"}>{bit}</text>
      );
      draw(c);
    });
    if (p.node.byte !== undefined) {
      nodes.push(
        <g key={`n${p.node.id}`}>
          <rect x={cx - 25} y={cy - 22} width={50} height={44} rx={8} className="t-leaf" />
          <text x={cx} y={cy - 2} className="t-sym">{symLabel(p.node.byte)}</text>
          <text x={cx} y={cy + 14} className="t-freq">{p.node.freq}</text>
        </g>
      );
    } else {
      nodes.push(
        <g key={`n${p.node.id}`}>
          <circle cx={cx} cy={cy} r={19} className="t-node" />
          <text x={cx} y={cy + 4} className="t-freq">{p.node.freq}</text>
        </g>
      );
    }
  };
  draw(tree);

  const w = Math.max(counter.i, 1) * GX + PAD, h = depth * GY + 70;
  return (
    <div className="tree-scroll">
      <svg width={w} height={h} role="img" aria-label="Huffman tree">{edges}{nodes}</svg>
    </div>
  );
}
