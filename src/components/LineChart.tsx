interface Point {
  index: number;
  score: number;
  ts: string;
}

interface Props {
  data: Point[];
  height?: number;
}

/**
 * Pure-SVG line chart for score progression. Shows a smooth path with
 * dots at each attempt, plus a trend line (linear fit) underneath.
 */
export function LineChart({ data, height = 220 }: Props) {
  if (data.length === 0) {
    return (
      <div
        className="w-full flex items-center justify-center"
        style={{ height, color: "#8a9bb0", fontSize: 13 }}
      >
        No attempts yet. Submit a case to see your progression.
      </div>
    );
  }

  const padLeft = 40;
  const padRight = 16;
  const padTop = 24;
  const padBot = 32;
  const W = 700; // viewBox width — scales with container
  const H = height;

  const innerW = W - padLeft - padRight;
  const innerH = H - padTop - padBot;

  // Y axis fixed 0-100
  function ySpace(score: number) {
    return padTop + innerH - (Math.max(0, Math.min(100, score)) / 100) * innerH;
  }
  // X axis index 1..n
  function xSpace(index: number) {
    if (data.length === 1) return padLeft + innerW / 2;
    return padLeft + ((index - 1) / (data.length - 1)) * innerW;
  }

  const pathPoints = data.map((p) => [xSpace(p.index), ySpace(p.score)] as const);
  const linePath = pathPoints.reduce((acc, [x, y], i) => {
    return acc + (i === 0 ? `M${x},${y}` : ` L${x},${y}`);
  }, "");

  // Filled area under line
  const areaPath =
    linePath +
    ` L${pathPoints[pathPoints.length - 1][0]},${H - padBot}` +
    ` L${pathPoints[0][0]},${H - padBot} Z`;

  // Simple linear regression for the trend line
  const n = data.length;
  const meanX = data.reduce((s, p) => s + p.index, 0) / n;
  const meanY = data.reduce((s, p) => s + p.score, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of data) {
    num += (p.index - meanX) * (p.score - meanY);
    den += (p.index - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;
  const trendStart = ySpace(slope * 1 + intercept);
  const trendEnd = ySpace(slope * n + intercept);

  // y-axis ticks
  const ticks = [0, 25, 50, 75, 100];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      style={{ fontFamily: "var(--font-sans)" }}
    >
      {/* Y-axis gridlines + labels */}
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={padLeft}
            x2={W - padRight}
            y1={ySpace(t)}
            y2={ySpace(t)}
            stroke="#eef2f7"
            strokeWidth={1}
          />
          <text
            x={padLeft - 8}
            y={ySpace(t)}
            textAnchor="end"
            dominantBaseline="middle"
            fill="#8a9bb0"
            fontSize="10"
          >
            {t}
          </text>
        </g>
      ))}

      {/* X-axis baseline */}
      <line
        x1={padLeft}
        x2={W - padRight}
        y1={H - padBot}
        y2={H - padBot}
        stroke="#e2e8f0"
        strokeWidth={1}
      />

      {/* Trend line */}
      <line
        x1={xSpace(1)}
        y1={trendStart}
        x2={xSpace(n)}
        y2={trendEnd}
        stroke="#8a9bb0"
        strokeWidth={1}
        strokeDasharray="4 3"
      />

      {/* Area + line */}
      <path d={areaPath} fill="rgba(232, 73, 15, 0.08)" />
      <path d={linePath} fill="none" stroke="#e8490f" strokeWidth={2} />

      {/* Dots */}
      {pathPoints.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={3.5}
          fill="#ffffff"
          stroke="#e8490f"
          strokeWidth={2}
        />
      ))}

      {/* X axis labels: first, middle, last */}
      {[0, Math.floor(n / 2), n - 1].map((i) => {
        if (i < 0 || i >= n) return null;
        const p = data[i];
        const d = new Date(p.ts);
        const label = isNaN(d.getTime())
          ? `#${p.index}`
          : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
        return (
          <text
            key={i}
            x={xSpace(p.index)}
            y={H - 10}
            textAnchor="middle"
            fill="#8a9bb0"
            fontSize="10"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}
