"use client";

import { useState } from "react";
import type { PriceTrend } from "@/types";
import { formatPricePerSqm } from "@/lib/formatters";

interface PriceTrendChartProps {
  data: PriceTrend[];
  height?: number;
}

export function PriceTrendChart({ data, height = 120 }: PriceTrendChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (data.length < 2) return null;

  const shown = data.slice(-24);
  const values = shown.map((d) => d.avg_price_per_sqm);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const padding = { top: 8, right: 8, bottom: 20, left: 8 };
  const width = 360;
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const points = shown.map((d, i) => ({
    x: padding.left + (i / (shown.length - 1)) * chartW,
    y: padding.top + chartH - ((d.avg_price_per_sqm - min) / range) * chartH,
    data: d,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  const hovered = hoverIdx !== null ? points[hoverIdx] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <path d={areaPath} fill="url(#trendGrad)" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />

        {/* X-axis labels */}
        {shown.map((d, i) => {
          if (shown.length <= 6 || i % Math.ceil(shown.length / 6) === 0 || i === shown.length - 1) {
            return (
              <text
                key={d.month}
                x={points[i].x}
                y={height - 2}
                textAnchor="middle"
                className="fill-gray-400"
                fontSize="8"
              >
                {d.month.slice(2)}
              </text>
            );
          }
          return null;
        })}

        {/* Hover zones */}
        {points.map((p, i) => (
          <rect
            key={i}
            x={p.x - chartW / shown.length / 2}
            y={padding.top}
            width={chartW / shown.length}
            height={chartH}
            fill="transparent"
            onMouseEnter={() => setHoverIdx(i)}
          />
        ))}

        {/* Hover dot */}
        {hovered && (
          <circle cx={hovered.x} cy={hovered.y} r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
        )}
      </svg>

      {/* Tooltip */}
      {hovered && (
        <div
          className="absolute top-0 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap"
          style={{ left: Math.min(hovered.x, width - 120), transform: "translateX(-50%)" }}
        >
          {hovered.data.month}: {formatPricePerSqm(hovered.data.avg_price_per_sqm)} ({hovered.data.transaction_count} trans.)
        </div>
      )}
    </div>
  );
}
