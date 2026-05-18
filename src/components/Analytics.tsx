import { useState, useMemo } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RadarAxis {
  label: string;
  value: number; // 0-100
}

interface ScorePoint {
  label: string;
  score: number;
  percentile: number;
}

// ---------------------------------------------------------------------------
// FALLBACK DATA (used when Supabase has no submissions)
// ---------------------------------------------------------------------------

export const CASE_AXES: RadarAxis[] = [
  { label: "Framework", value: 72 },
  { label: "Clarity", value: 65 },
  { label: "Approach", value: 80 },
  { label: "Execution", value: 58 },
  { label: "Quant Rigor", value: 61 },
  { label: "Hypothesis", value: 74 },
  { label: "Speed", value: 55 },
  { label: "Consistency", value: 68 },
];

export const GUESSTIMATE_AXES: RadarAxis[] = [
  { label: "Segmentation", value: 70 },
  { label: "Assumptions", value: 63 },
  { label: "Math Accuracy", value: 78 },
  { label: "Logical Flow", value: 66 },
  { label: "Sanity Check", value: 72 },
  { label: "Speed", value: 60 },
  { label: "Creativity", value: 54 },
  { label: "Consistency", value: 69 },
];

export const SCORE_HISTORY: ScorePoint[] = [
  { label: "1", score: 42, percentile: 35 },
  { label: "2", score: 48, percentile: 40 },
  { label: "3", score: 51, percentile: 44 },
  { label: "4", score: 46, percentile: 38 },
  { label: "5", score: 55, percentile: 48 },
  { label: "6", score: 58, percentile: 52 },
  { label: "7", score: 62, percentile: 57 },
  { label: "8", score: 60, percentile: 55 },
  { label: "9", score: 67, percentile: 63 },
  { label: "10", score: 65, percentile: 60 },
  { label: "11", score: 70, percentile: 68 },
  { label: "12", score: 72, percentile: 71 },
  { label: "13", score: 68, percentile: 65 },
  { label: "14", score: 75, percentile: 76 },
  { label: "15", score: 78, percentile: 80 },
  { label: "16", score: 74, percentile: 74 },
  { label: "17", score: 80, percentile: 83 },
  { label: "18", score: 82, percentile: 85 },
  { label: "19", score: 79, percentile: 81 },
  { label: "20", score: 85, percentile: 88 },
];

// ---------------------------------------------------------------------------
// Radar Chart — pure SVG, interactive hover
// ---------------------------------------------------------------------------

const RADAR_SIZE = 220;
const RADAR_CENTER = RADAR_SIZE / 2;
const RADAR_RADIUS = 85;
const RINGS = [0.25, 0.5, 0.75, 1];

function polarToXY(angle: number, radius: number): [number, number] {
  const rad = (angle - 90) * (Math.PI / 180);
  return [RADAR_CENTER + radius * Math.cos(rad), RADAR_CENTER + radius * Math.sin(rad)];
}

export function RadarChart({
  axes,
  accent = "#E8490F",
  title,
}: {
  axes: RadarAxis[];
  accent?: string;
  title: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const n = axes.length;
  const angleStep = 360 / n;

  const points = axes.map((a, i) => {
    const r = (a.value / 100) * RADAR_RADIUS;
    return polarToXY(i * angleStep, r);
  });
  const polygon = points.map((p) => p.join(",")).join(" ");

  return (
    <div className="flex flex-col items-center">
      <p
        className="text-[11px] uppercase tracking-[0.1em] font-bold text-[#8a9bb0] mb-3"
      >
        {title}
      </p>
      <svg
        viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}
        width={RADAR_SIZE}
        height={RADAR_SIZE}
        className="select-none"
      >
        {/* Grid rings */}
        {RINGS.map((r) => (
          <polygon
            key={r}
            points={Array.from({ length: n }, (_, i) =>
              polarToXY(i * angleStep, RADAR_RADIUS * r).join(","),
            ).join(" ")}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={0.5}
          />
        ))}

        {/* Axes */}
        {axes.map((_, i) => {
          const [x, y] = polarToXY(i * angleStep, RADAR_RADIUS);
          return (
            <line
              key={i}
              x1={RADAR_CENTER}
              y1={RADAR_CENTER}
              x2={x}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth={0.5}
            />
          );
        })}

        {/* Filled area */}
        <polygon
          points={polygon}
          fill={`${accent}20`}
          stroke={accent}
          strokeWidth={1.5}
        />

        {/* Data dots + labels */}
        {axes.map((a, i) => {
          const [x, y] = points[i];
          const [lx, ly] = polarToXY(i * angleStep, RADAR_RADIUS + 16);
          const isHov = hovered === i;
          return (
            <g
              key={a.label}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "pointer" }}
            >
              <circle
                cx={x}
                cy={y}
                r={isHov ? 5 : 3}
                fill={accent}
                stroke="#fff"
                strokeWidth={1.5}
                style={{ transition: "r 150ms ease" }}
              />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={isHov ? 9 : 8}
                fontWeight={isHov ? 700 : 500}
                fill={isHov ? accent : "#8a9bb0"}
                style={{ transition: "all 150ms ease" }}
              >
                {a.label}
              </text>
              {isHov && (
                <text
                  x={x}
                  y={y - 10}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={700}
                  fill={accent}
                >
                  {a.value}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Score Progression Line Chart — pure SVG, interactive hover
// ---------------------------------------------------------------------------

const CHART_W = 480;
const CHART_H = 160;
const PAD_L = 32;
const PAD_R = 12;
const PAD_T = 16;
const PAD_B = 28;

export function ScoreGraph({
  data,
  showPercentile = false,
}: {
  data: ScorePoint[];
  showPercentile?: boolean;
}) {
  const [hovIdx, setHovIdx] = useState<number | null>(null);

  const vals = data.map((d) => (showPercentile ? d.percentile : d.score));
  const maxV = Math.max(...vals, 100);
  const minV = Math.min(...vals, 0);

  const plotW = CHART_W - PAD_L - PAD_R;
  const plotH = CHART_H - PAD_T - PAD_B;

  const pts = data.map((_, i) => {
    const x = PAD_L + (i / (data.length - 1)) * plotW;
    const y = PAD_T + plotH - ((vals[i] - minV) / (maxV - minV || 1)) * plotH;
    return [x, y] as [number, number];
  });

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  const areaPath = `${linePath} L${pts[pts.length - 1][0]},${PAD_T + plotH} L${pts[0][0]},${PAD_T + plotH} Z`;

  // Y-axis ticks
  const yTicks = [0, 25, 50, 75, 100].filter((v) => v <= maxV);

  return (
    <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full" style={{ maxWidth: CHART_W }}>
      {/* Grid lines */}
      {yTicks.map((v) => {
        const y = PAD_T + plotH - ((v - minV) / (maxV - minV || 1)) * plotH;
        return (
          <g key={v}>
            <line x1={PAD_L} x2={CHART_W - PAD_R} y1={y} y2={y} stroke="#e2e8f0" strokeWidth={0.5} />
            <text x={PAD_L - 4} y={y} textAnchor="end" dominantBaseline="central" fontSize={8} fill="#8a9bb0">
              {v}
            </text>
          </g>
        );
      })}

      {/* Area fill */}
      <path d={areaPath} fill="url(#scoreGrad)" />
      <defs>
        <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E8490F" stopOpacity={0.15} />
          <stop offset="100%" stopColor="#E8490F" stopOpacity={0.02} />
        </linearGradient>
      </defs>

      {/* Line */}
      <path d={linePath} fill="none" stroke="#E8490F" strokeWidth={1.5} strokeLinejoin="round" />

      {/* Interactive dots */}
      {pts.map((p, i) => (
        <g key={i} onMouseEnter={() => setHovIdx(i)} onMouseLeave={() => setHovIdx(null)} style={{ cursor: "pointer" }}>
          <circle cx={p[0]} cy={p[1]} r={hovIdx === i ? 5 : 2.5} fill="#E8490F" stroke="#fff" strokeWidth={1} />
          {hovIdx === i && (
            <>
              <line x1={p[0]} y1={PAD_T} x2={p[0]} y2={PAD_T + plotH} stroke="#E8490F" strokeWidth={0.5} strokeDasharray="3,3" />
              <rect x={p[0] - 22} y={p[1] - 22} width={44} height={16} rx={3} fill="#0a1628" />
              <text x={p[0]} y={p[1] - 12} textAnchor="middle" fontSize={9} fontWeight={700} fill="#fff">
                {showPercentile ? `P${vals[i]}` : vals[i]}
              </text>
            </>
          )}
        </g>
      ))}

      {/* X-axis label */}
      <text x={CHART_W / 2} y={CHART_H - 4} textAnchor="middle" fontSize={8} fill="#8a9bb0">
        Submissions →
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Percentile Card
// ---------------------------------------------------------------------------

export function PercentileCard({
  rank,
  totalUsers,
  period,
}: {
  rank: number | null;
  totalUsers: number;
  period: string;
}) {
  const pct = rank && totalUsers > 0 ? Math.round((1 - rank / totalUsers) * 100) : null;
  const display = pct !== null ? `${pct}th` : "—";

  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-[0.1em] font-bold text-[#8a9bb0]">{period}</p>
      <p
        className="mt-1 font-bold tabular-nums"
        style={{ fontSize: "28px", color: "#E8490F", fontFamily: "var(--font-mono)", letterSpacing: "-0.02em" }}
      >
        {display}
      </p>
      <p className="text-[10px] text-[#8a9bb0]">percentile</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Strengths & Focus Areas
// ---------------------------------------------------------------------------

export function InsightsPanel({ caseAxes, guessAxes }: { caseAxes: RadarAxis[]; guessAxes: RadarAxis[] }) {
  const all = [...caseAxes, ...guessAxes];
  const sorted = [...all].sort((a, b) => b.value - a.value);
  const strengths = sorted.slice(0, 3);
  const focus = sorted.slice(-3).reverse();

  return (
    <div className="grid grid-cols-2 gap-4 mt-6">
      <div className="p-4" style={{ background: "rgba(22,163,74,0.06)", borderRadius: 6, border: "1px solid rgba(22,163,74,0.15)" }}>
        <p className="text-[10px] uppercase tracking-[0.1em] font-bold" style={{ color: "#16A34A" }}>
          Your strengths
        </p>
        <ul className="mt-2 space-y-1">
          {strengths.map((s) => (
            <li key={s.label} className="text-[12px] text-[#0a1628] flex items-center gap-2">
              <span className="font-bold tabular-nums" style={{ color: "#16A34A", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                {s.value}
              </span>
              {s.label}
            </li>
          ))}
        </ul>
      </div>
      <div className="p-4" style={{ background: "rgba(232,73,15,0.06)", borderRadius: 6, border: "1px solid rgba(232,73,15,0.15)" }}>
        <p className="text-[10px] uppercase tracking-[0.1em] font-bold" style={{ color: "#E8490F" }}>
          Focus next
        </p>
        <ul className="mt-2 space-y-1">
          {focus.map((s) => (
            <li key={s.label} className="text-[12px] text-[#0a1628] flex items-center gap-2">
              <span className="font-bold tabular-nums" style={{ color: "#E8490F", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                {s.value}
              </span>
              {s.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
