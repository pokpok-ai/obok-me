"use client";

import { useState, useMemo } from "react";
import type { PriceTrend } from "@/types";
import { formatPricePerSqm } from "@/lib/formatters";
import { generateForecast, type ForecastPoint } from "@/lib/forecast";
import { usePathLength } from "@/hooks/usePathLength";

interface PriceTrendChartProps {
  data: PriceTrend[];
  height?: number;
}

export function PriceTrendChart({ data, height = 120 }: PriceTrendChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const { ref: histRef, length: histLength } = usePathLength<SVGPathElement>();
  const { ref: forecastRef, length: forecastLength } = usePathLength<SVGPathElement>();

  const forecast = useMemo(() => generateForecast(data, 5), [data]);

  if (data.length < 2) return null;

  const shown = data.slice(-24);

  // Combine historical + forecast for scale calculation
  const allValues = [
    ...shown.map((d) => d.avg_price_per_sqm),
    ...forecast.map((f) => f.avg_price_per_sqm),
  ];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;

  const totalPoints = shown.length + forecast.length;

  const padding = { top: 8, right: 8, bottom: 20, left: 8 };
  const width = 360;
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const points = shown.map((d, i) => ({
    x: padding.left + (i / (totalPoints - 1)) * chartW,
    y: padding.top + chartH - ((d.avg_price_per_sqm - min) / range) * chartH,
    data: d,
    isForecast: false,
  }));

  const forecastPoints = forecast.map((f, i) => ({
    x: padding.left + ((shown.length + i) / (totalPoints - 1)) * chartW,
    y: padding.top + chartH - ((f.avg_price_per_sqm - min) / range) * chartH,
    data: { month: f.month, avg_price_per_sqm: f.avg_price_per_sqm, transaction_count: 0 } as PriceTrend,
    isForecast: true,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  // Forecast dashed line: starts from last historical point
  const forecastLinePath = forecastPoints.length > 0
    ? `M ${points[points.length - 1].x} ${points[points.length - 1].y} ` +
      forecastPoints.map((p) => `L ${p.x} ${p.y}`).join(" ")
    : "";

  // Forecast area fill
  const forecastAreaPath = forecastPoints.length > 0
    ? `M ${points[points.length - 1].x} ${points[points.length - 1].y} ` +
      forecastPoints.map((p) => `L ${p.x} ${p.y}`).join(" ") +
      ` L ${forecastPoints[forecastPoints.length - 1].x} ${padding.top + chartH} L ${points[points.length - 1].x} ${padding.top + chartH} Z`
    : "";

  const allPoints = [...points, ...forecastPoints];
  const hovered = hoverIdx !== null ? allPoints[hoverIdx] : null;

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
          <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Historical area fill */}
        <path d={areaPath} fill="url(#trendGrad)" className="animate-fade-in" style={{ animationDelay: "400ms" }} />

        {/* Forecast area fill */}
        {forecastAreaPath && (
          <path d={forecastAreaPath} fill="url(#forecastGrad)" className="animate-fade-in" style={{ animationDelay: "600ms" }} />
        )}

        {/* Historical line */}
        <path
          ref={histRef}
          d={linePath}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeLinejoin="round"
          className={histLength ? "animate-draw-line" : ""}
          style={histLength ? { strokeDasharray: histLength, "--path-length": histLength } as React.CSSProperties : undefined}
        />

        {/* Forecast dashed line */}
        {forecastLinePath && (
          <path
            ref={forecastRef}
            d={forecastLinePath}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeDasharray={forecastLength ? `${forecastLength}` : "6 3"}
            className={forecastLength ? "animate-draw-line" : ""}
            style={forecastLength ? { "--path-length": forecastLength, animationDelay: "600ms" } as React.CSSProperties : undefined}
          />
        )}

        {/* Divider line between historical and forecast */}
        {forecastPoints.length > 0 && (
          <line
            x1={points[points.length - 1].x}
            y1={padding.top}
            x2={points[points.length - 1].x}
            y2={padding.top + chartH}
            stroke="#d1d5db"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}

        {/* X-axis labels */}
        {allPoints.map((p, i) => {
          const labelInterval = Math.ceil(totalPoints / 6);
          if (totalPoints <= 6 || i % labelInterval === 0 || i === totalPoints - 1) {
            return (
              <text
                key={p.data.month}
                x={p.x}
                y={height - 2}
                textAnchor="middle"
                className={p.isForecast ? "fill-amber-400" : "fill-gray-400"}
                fontSize="8"
              >
                {p.data.month.slice(2)}
              </text>
            );
          }
          return null;
        })}

        {/* Hover zones */}
        {allPoints.map((p, i) => (
          <rect
            key={i}
            x={p.x - chartW / totalPoints / 2}
            y={padding.top}
            width={chartW / totalPoints}
            height={chartH}
            fill="transparent"
            onMouseEnter={() => setHoverIdx(i)}
          />
        ))}

        {/* Hover dot */}
        {hovered && (
          <circle
            cx={hovered.x}
            cy={hovered.y}
            r="4"
            fill={hovered.isForecast ? "#f59e0b" : "#3b82f6"}
            stroke="white"
            strokeWidth="2"
          />
        )}
      </svg>

      {/* Tooltip */}
      {hovered && (
        <div
          className="absolute top-0 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap"
          style={{ left: Math.min(hovered.x, width - 120), transform: "translateX(-50%)" }}
        >
          {hovered.isForecast ? "Prognoza " : ""}
          {hovered.data.month}: {formatPricePerSqm(hovered.data.avg_price_per_sqm)}
          {!hovered.isForecast && ` (${hovered.data.transaction_count} trans.)`}
        </div>
      )}

      {/* Legend */}
      {forecast.length > 0 && (
        <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-blue-500 inline-block" /> Dane
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-amber-500 inline-block" style={{ borderTop: "2px dashed #f59e0b", height: 0 }} /> Prognoza (5 mies.)
          </span>
        </div>
      )}
    </div>
  );
}
