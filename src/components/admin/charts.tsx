// Custom SVG charts — avoids recharts + React 19 incompatibility
// Simple horizontal bar chart + donut chart

export function BarChart7({ data }: { data: { day: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const barHeight = 28;
  const gap = 8;
  const totalHeight = data.length * (barHeight + gap);
  const width = "100%";

  return (
    <div className="w-full" style={{ height: totalHeight }}>
      {data.map((d, i) => (
        <div key={d.day} className="flex items-center gap-2" style={{ height: barHeight, marginBottom: gap }}>
          <span className="text-[11px] font-body text-feather w-8 text-right">{d.day}</span>
          <div className="flex-1 bg-feather/10 rounded relative overflow-hidden" style={{ height: barHeight }}>
            <div
              className="bg-forest rounded h-full flex items-center justify-end pr-2 transition-all"
              style={{ width: `${(d.count / max) * 100}%`, minWidth: d.count > 0 ? "20px" : "0" }}
            >
              {d.count > 0 && (
                <span className="text-white text-[11px] font-body font-semibold">{d.count}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatusDonut({
  data,
  size = 160,
}: {
  data: { name: string; value: number; color: string }[];
  size?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center text-feather text-[13px] font-body italic" style={{ height: size }}>
        No data
      </div>
    );
  }

  const radius = size / 2 - 8;
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;

  // Pre-compute cumulative offsets using reduce (no in-render mutation)
  const arcs = data.reduce<{ d: { name: string; value: number; color: string }; dashArray: string; dashOffset: number }[]>((acc, d) => {
    const fraction = d.value / total;
    const length = fraction * circumference;
    const prevOffset = acc.length > 0 ? -acc[acc.length - 1].dashOffset : 0;
    return [
      ...acc,
      {
        d,
        dashArray: `${length} ${circumference - length}`,
        dashOffset: -(prevOffset + length),
      },
    ];
  }, []);
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {arcs.map(({ d, dashArray, dashOffset }, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={radius}
            fill="transparent"
            stroke={d.color}
            strokeWidth={strokeWidth}
            strokeDasharray={dashArray}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        ))}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          className="font-heading"
          style={{ fontSize: 24, fill: "#424B50", fontWeight: 700 }}
        >
          {total}
        </text>
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          style={{ fontSize: 11, fill: "#89959A", fontFamily: "Lato, sans-serif" }}
        >
          requests
        </text>
      </svg>
    </div>
  );
}
