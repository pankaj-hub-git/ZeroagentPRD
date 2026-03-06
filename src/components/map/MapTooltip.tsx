interface MapTooltipProps {
  x: number;
  y: number;
  properties: Record<string, unknown>;
}

export function MapTooltip({ x, y, properties }: MapTooltipProps) {
  return (
    <div
      className="absolute z-50 bg-surface border border-border rounded-lg p-3 shadow-xl pointer-events-none"
      style={{ left: x + 10, top: y - 10, maxWidth: 280 }}
    >
      {Object.entries(properties).map(([key, val]) => {
        if (val === null || val === undefined) return null;
        return (
          <div key={key} className="flex items-center justify-between gap-4 py-0.5">
            <span className="text-micro text-text-dim capitalize">{key.replace(/_/g, ' ')}</span>
            <span className="text-micro text-text-primary font-mono">{String(val)}</span>
          </div>
        );
      })}
    </div>
  );
}
