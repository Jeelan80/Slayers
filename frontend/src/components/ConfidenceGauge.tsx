'use client';

interface Props {
  value: number; // 0..1
  size?: number;
  label?: string;
}

export default function ConfidenceGauge({ value, size = 180, label = 'AI Confidence' }: Props) {
  const pct = Math.max(0, Math.min(1, value));
  const percent = Math.round(pct * 100);

  const stroke = 12;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const sweep = 260;
  const startAngle = 140;
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

  const gradientId = `gauge-gradient-${Math.random().toString(36).substr(2, 9)}`;
  const color1 = percent < 50 ? '#f43f5e' : percent < 75 ? '#f59e0b' : '#00C48C';
  const color2 = percent < 50 ? '#e11d48' : percent < 75 ? '#d97706' : '#009E7E';

  return (
    <div className="flex flex-col items-center select-none">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color1} />
            <stop offset="100%" stopColor={color2} />
          </linearGradient>
        </defs>

        {/* Outer subtle ring */}
        <circle cx={cx} cy={cy} r={r + 5} fill="none" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />

        {/* Track */}
        <path
          d={arcPath(startAngle, endAngle)}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth={stroke}
          strokeLinecap="round"
        />

        {/* Active Arc */}
        {pct > 0 && (
          <path
            d={arcPath(startAngle, activeEnd)}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            className="gauge-arc transition-all duration-700"
          />
        )}

        <text
          x="50%"
          y="46%"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.22}
          fontWeight={900}
          fill="#0f172a"
          className="font-mono"
        >
          {percent}%
        </text>
        <text
          x="50%"
          y="65%"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.065}
          fill="#64748b"
          fontWeight={800}
          letterSpacing="0.1em"
        >
          {label.toUpperCase()}
        </text>
      </svg>
    </div>
  );
}
