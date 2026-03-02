'use client';

import type { MonthlyRevenue } from '../../services/analytics';

interface RevenueChartProps {
  data: MonthlyRevenue[];
}

// Simple pure-SVG bar chart — no external dependencies
export function RevenueChart({ data }: RevenueChartProps) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const barWidth = 100 / data.length;

  const formatMonth = (month: string) => {
    const [year, m] = month.split('-');
    const date = new Date(Number(year), Number(m) - 1);
    return date.toLocaleDateString('ru-RU', { month: 'short' });
  };

  const formatRub = (value: number) =>
    value >= 1_000_000
      ? `${(value / 1_000_000).toFixed(1)}M`
      : value >= 1_000
      ? `${(value / 1_000).toFixed(0)}K`
      : String(value);

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${data.length * 40} 160`}
        className="w-full overflow-visible"
        style={{ height: '160px' }}
      >
        {data.map((d, i) => {
          const barHeight = Math.max(4, (d.revenue / maxRevenue) * 120);
          const x = i * 40 + 4;
          const y = 130 - barHeight;
          const isLast = i === data.length - 1;
          return (
            <g key={d.month}>
              <rect
                x={x}
                y={y}
                width={32}
                height={barHeight}
                rx={4}
                className={isLast ? 'fill-rose-500' : 'fill-rose-200'}
              />
              {d.revenue > 0 && (
                <text
                  x={x + 16}
                  y={y - 4}
                  textAnchor="middle"
                  fontSize="7"
                  className="fill-gray-500"
                >
                  {formatRub(d.revenue)}
                </text>
              )}
              <text
                x={x + 16}
                y={148}
                textAnchor="middle"
                fontSize="8"
                className="fill-gray-400"
              >
                {formatMonth(d.month)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
