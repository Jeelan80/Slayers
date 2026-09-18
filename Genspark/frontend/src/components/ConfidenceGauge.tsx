'use client';

interface Props {
  value: number; // 0..1
  size?: number;
  label?: string;
}

export default function ConfidenceGauge({ value, size = 180, label = 'AI Confidence' }: Props) {
  const pct = Math.max(0, Math.min(1, value));
  const percent = Math.round(pct * 100);

  // 3/4 arc — from -225deg to 45deg (270deg sweep)
  const stroke = 14;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const sweep = 270;
  const startAngle = 135; // degrees, canvas-style
  const endAngle = startAngle + sweep;

  const polar = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const arcPath = (fromDeg: number, toDeg: number) => {
    const a = polar(fromDeg);
    const b = polar(toDeg);
    const large = toDeg - fromDeg > 180 ? 1 : 0;
    return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`;
  };

  const activeEnd = startAngle + sweep * pct;

  const color =
    percent < 50 ? '#dc2626' : percent < 75 ? '#d97706' : '#009E7E';

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <path
          d={arcPath(startAngle, endAngle)}
          fill="none"
          stroke="#e5e9f0"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {/* Active */}
        {pct > 0 && (
          <path
            d={arcPath(startAngle, activeEnd)}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            className="gauge-arc"
            style={{ transition: 'd 500ms ease' }}
          />
        )}
        <text
          x="50%"
          y="48%"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.24}
          fontWeight={700}
          fill="#1a1f2e"
        >
          {percent}%
        </text>
        <text
          x="50%"
          y="66%"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.075}
          fill="#6b7280"
          fontWeight={500}
          letterSpacing="1"
        >
          {label.toUpperCase()}
        </text>
      </svg>
    </div>
  );
}
