interface ScoreRingProps {
  score: number;
  label: string;
  size?: number;
  color?: string;
}

export function ScoreRing({ score, label, size = 80, color = '#C9A84C' }: ScoreRingProps) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={4}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="score-ring"
        />
      </svg>
      <div className="absolute flex items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-subheading font-semibold" style={{ color }}>
          {Math.round(score)}
        </span>
      </div>
      <span className="text-micro text-text-dim text-center leading-tight">{label}</span>
    </div>
  );
}
