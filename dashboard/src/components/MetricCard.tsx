interface MetricTrend {
  current: number;
  previous: number;
  direction: 'up' | 'stable' | 'down';
  changePercent: number;
}

const TREND_ARROWS: Record<string, { symbol: string; color: string }> = {
  up: { symbol: '\u2191', color: 'text-green-600' },
  down: { symbol: '\u2193', color: 'text-red-600' },
  stable: { symbol: '\u2192', color: 'text-gray-500' },
};

export default function MetricCard({
  label,
  trend,
  format = 'percent',
}: {
  label: string;
  trend: MetricTrend;
  format?: 'percent' | 'number';
}) {
  const { symbol, color } = TREND_ARROWS[trend.direction] ?? TREND_ARROWS.stable;
  const displayValue =
    format === 'percent' ? `${(trend.current * 100).toFixed(0)}%` : String(trend.current);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold">{displayValue}</span>
        <span className={`text-sm font-medium ${color}`}>
          {symbol} {Math.abs(trend.changePercent).toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
