interface Axis {
  axis: string;
  value: number; // 0-100
}

interface Props {
  current: Axis[];
  prior?: Axis[];
  size?: number;
  rings?: number;
}

/**
 * Pure-SVG radar chart. Two layered polygons: prior (ghosted)
 * and current (orange). Labels around the perimeter.
 */
export function RadarChart({
  current,
  prior = [],
  size = 280,
  rings = 5,
}: Props) {
  if (current.length === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 56; // breathing room for labels

  // Coordinates for each value (0-100 → 0-radius)
  function pointFor(value: number, idx: number, count: number) {
    const angle = (Math.PI * 2 * idx) / count - Math.PI / 2;
    const r = (Math.max(0, Math.min(100, value)) / 100) * radius;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r] as const;
  }

  function polyPath(values: Axis[]) {
    return values
      .map((v, i) => pointFor(v.value, i, current.length).join(","))
      .join(" ");
  }

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      height="100%"
      style={{ maxWidth: size, fontFamily: "var(--font-sans)" }}
    >
      {/* Concentric rings */}
      {Array.from({ length: rings }, (_, i) => {
        const r = (radius * (i + 1)) / rings;
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={1}
          />
        );
      })}

      {/* Spokes */}
      {current.map((_, i) => {
        const [x, y] = pointFor(100, i, current.length);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="#e2e8f0"
            strokeWidth={1}
          />
        );
      })}

      {/* Prior polygon (ghosted) */}
      {prior.length === current.length && (
        <polygon
          points={polyPath(prior)}
          fill="rgba(138, 155, 176, 0.12)"
          stroke="#8a9bb0"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
      )}

      {/* Current polygon (orange) */}
      <polygon
        points={polyPath(current)}
        fill="rgba(232, 73, 15, 0.18)"
        stroke="#e8490f"
        strokeWidth={2}
      />

      {/* Value dots */}
      {current.map((c, i) => {
        const [x, y] = pointFor(c.value, i, current.length);
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={3.5}
            fill="#e8490f"
          />
        );
      })}

      {/* Axis labels */}
      {current.map((c, i) => {
        const [x, y] = pointFor(118, i, current.length);
        return (
          <g key={i}>
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#0a1628"
              fontSize="11"
              fontWeight={600}
              letterSpacing="-0.005em"
            >
              {c.axis}
            </text>
            <text
              x={x}
              y={y + 14}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#8a9bb0"
              fontSize="10"
              fontWeight={500}
            >
              {c.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
