import { memo, useId, useMemo } from "react";
import { seeded } from "@/utils/weatherHelpers";
import type { SceneStyle } from "./sceneConfig";

const W = 1600;
const H = 420;
const BASE = H;

interface Building { x: number; w: number; h: number; kind: "flat" | "stepped" | "mast" | "slope" }
interface Win { x: number; y: number; r: number }

interface Geometry {
  far: Building[];
  near: Building[];
  windows: Win[];
  landmarks: boolean;
}

function gen(seed: string, landmarks: boolean): Geometry {
  const rnd = seeded(seed);
  const reserved: [number, number][] = landmarks ? [[470, 760], [1130, 1330]] : [];
  const free = (x: number, w: number) => reserved.every(([a, b]) => x + w < a || x > b);

  const far: Building[] = [];
  for (let x = -30; x < W + 30;) {
    const w = 34 + rnd() * 60;
    far.push({ x, w, h: 150 + rnd() * 200, kind: rnd() > 0.7 ? "mast" : "flat" });
    x += w + rnd() * 18;
  }

  const near: Building[] = [];
  for (let x = -20; x < W + 20;) {
    const w = 46 + rnd() * 74;
    if (free(x, w)) {
      const r = rnd();
      near.push({ x, w, h: 80 + rnd() * 190, kind: r > 0.82 ? "stepped" : r > 0.68 ? "mast" : r > 0.6 ? "slope" : "flat" });
    }
    x += w + 2 + rnd() * 10;
  }

  const windows: Win[] = [];
  for (const b of near) {
    if (b.w < 50) continue;
    const top = BASE - b.h + 18;
    for (let wy = top; wy < BASE - 16; wy += 17) {
      for (let wx = b.x + 9; wx < b.x + b.w - 10; wx += 13) windows.push({ x: wx, y: wy, r: rnd() });
    }
  }
  return { far, near, windows, landmarks };
}

function buildingPath(b: Building): string {
  const top = BASE - b.h;
  switch (b.kind) {
    case "stepped": {
      const inset = b.w * 0.22;
      const tier = Math.min(46, b.h * 0.22);
      return `M${b.x} ${BASE}V${top + tier}H${b.x + inset}V${top}H${b.x + b.w - inset}V${top + tier}H${b.x + b.w}V${BASE}Z`;
    }
    case "mast": {
      const cx = b.x + b.w / 2;
      return `M${b.x} ${BASE}V${top}H${cx - 2}V${top - 34}H${cx + 2}V${top}H${b.x + b.w}V${BASE}Z`;
    }
    case "slope":
      return `M${b.x} ${BASE}V${top + 22}L${b.x + b.w} ${top}V${BASE}Z`;
    default:
      return `M${b.x} ${BASE}V${top}H${b.x + b.w}V${BASE}Z`;
  }
}

/** Kahn's National Parliament (Jatiya Sangsad Bhaban) + a domed mosque, as silhouettes. */
function DhakaLandmarks() {
  // Parliament: layered blocks with the iconic circle and triangle cut-outs (evenodd holes).
  const parliament = [
    "M480 420V262H540V420Z",
    "M548 420V228H628V420Z M566 290a22 22 0 1 0 44 0a22 22 0 1 0 -44 0Z M570 360L588 326L606 360Z",
    "M636 420V204H700V420Z M650 262a18 18 0 1 0 36 0a18 18 0 1 0 -36 0Z",
    "M708 420V246H752V420Z M718 330L730 300L742 330Z",
    "M470 420V330H762V420Z M506 386a14 14 0 1 0 28 0a14 14 0 1 0 -28 0Z M676 386a14 14 0 1 0 28 0a14 14 0 1 0 -28 0Z",
  ];
  return (
    <g>
      {parliament.map((d) => <path key={d} d={d} fillRule="evenodd" />)}
      {/* mosque */}
      <path d="M1170 420V330H1290V420Z" />
      <path d="M1180 330a50 50 0 0 1 100 0Z" />
      <path d="M1226 280h8v-14h-8z" />
      <path d="M1146 420V196h12V420Z M1144 196l8-16 8 16Z" />
      <path d="M1302 420V196h12V420Z M1300 196l8-16 8 16Z" />
      <path d="M1142 250h20v6h-20z M1298 250h20v6h-20z" />
    </g>
  );
}

interface Props {
  style: SceneStyle;
  seed: string;
  landmarks?: boolean;
  /** render as a mirrored, faded reflection */
  reflection?: boolean;
  showFar?: boolean;
}

export const Skyline = memo(function Skyline({ style, seed, landmarks = false, reflection = false, showFar = true }: Props) {
  const geo = useMemo(() => gen(seed, landmarks), [seed, landmarks]);
  const uid = useId().replace(/:/g, "");
  const lit = geo.windows.filter((w) => w.r < style.litChance);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full"
      style={reflection ? { transform: "scaleY(-1)" } : undefined} aria-hidden="true">
      <defs>
        <linearGradient id={`near-${uid}`} x1="0" y1="120" x2="0" y2={H} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={style.nearTop} />
          <stop offset="1" stopColor={style.near} />
        </linearGradient>
        <pattern id={`win-${uid}`} width="13" height="17" patternUnits="userSpaceOnUse">
          <rect x="4" y="5" width="5" height="7" rx="1" fill="#fff" opacity="0.06" />
        </pattern>
      </defs>
      {showFar && (
        <g fill={style.far} style={{ transition: "fill 1.2s ease" }}>
          {geo.far.map((b) => <path key={`f${b.x}`} d={buildingPath(b)} />)}
        </g>
      )}
      <g fill={`url(#near-${uid})`}>
        {geo.near.map((b) => <path key={`n${b.x}`} d={buildingPath(b)} />)}
        {geo.landmarks && <DhakaLandmarks />}
      </g>
      {!reflection && (
        <g fill={`url(#win-${uid})`}>
          {geo.near.filter((b) => b.w >= 50).map((b) => (
            <rect key={`p${b.x}`} x={b.x} y={BASE - b.h + 12} width={b.w} height={b.h - 26} />
          ))}
        </g>
      )}
      <g fill={style.windowLit}>
        {lit.map((w) => (
          <rect key={`${w.x}-${w.y}`} x={w.x} y={w.y} width="5" height="7" rx="1" opacity={0.55 + w.r} />
        ))}
      </g>
    </svg>
  );
});
