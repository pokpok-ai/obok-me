"use client";

import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import type { Parcel } from "@/types/dzialki";

interface PvCalculatorProps {
  parcel: Parcel;
  area: number; // m²
  onClose: () => void;
}

const PRICING_MODELS: Record<string, number> = {
  ppa: 340,
  spot: 380,
  auction: 300,
};

// Constants from parceel.pl
const PANEL_COVERAGE = 0.75;
const PANEL_EFFICIENCY = 0.17;
const IRRADIANCE = 1089; // kWh/kWp Poland avg
const CAPEX_PER_MWP = 2_200_000;
const TRANSFORMER_COST = 200_000; // per km
const OPEX_PER_MWP = 40_000;
const DEGRADATION = 0.005;
const PRICE_INFLATION = 0.02;
const RESIDUAL_VALUE = 0.10;

function formatPLN(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} mln PLN`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)} tys. PLN`;
  return `${Math.round(n)} PLN`;
}

export function PvCalculator({ parcel, area, onClose }: PvCalculatorProps) {
  const defaultHa = Math.round((area / 10000) * PANEL_COVERAGE * 100) / 100;

  const [areaHa, setAreaHa] = useState(Math.max(0.5, defaultHa));
  const [pricingModel, setPricingModel] = useState<"ppa" | "spot" | "auction">("ppa");
  const [energyPrice, setEnergyPrice] = useState(PRICING_MODELS.ppa);
  const [horizon, setHorizon] = useState(25);
  const [discountRate, setDiscountRate] = useState(7);
  const [transformerKm, setTransformerKm] = useState(2);

  const calc = useMemo(() => {
    const panelArea = areaHa * 10000 * PANEL_COVERAGE;
    const powerKw = panelArea * PANEL_EFFICIENCY;
    const powerMwp = powerKw / 1000;
    const productionMwh = (powerKw * IRRADIANCE) / 1000;
    const revenue = productionMwh * energyPrice;
    const capex = powerMwp * CAPEX_PER_MWP + transformerKm * TRANSFORMER_COST;
    const opex = powerMwp * OPEX_PER_MWP;
    const netCashflow = revenue - opex;
    const payback = netCashflow > 0 ? capex / netCashflow : Infinity;

    const r = discountRate / 100;
    let npv = -capex;
    let cumulative = -capex;
    const chartData: Array<{ rok: number; cumulative: number; capex: number }> = [];
    let breakEven: number | null = null;

    for (let yr = 1; yr <= horizon; yr++) {
      const deg = Math.pow(1 - DEGRADATION, yr);
      const infl = Math.pow(1 + PRICE_INFLATION, yr);
      const cf = productionMwh * energyPrice * deg * infl - opex;
      npv += cf / Math.pow(1 + r, yr);
      cumulative += cf;
      chartData.push({ rok: yr, cumulative: Math.round(cumulative), capex: Math.round(capex) });
      if (cumulative >= 0 && !breakEven) breakEven = yr;
    }
    npv += capex * RESIDUAL_VALUE / Math.pow(1 + r, horizon);

    return { powerMwp, productionMwh, revenue, capex, opex, netCashflow, payback, npv, chartData, breakEven };
  }, [areaHa, energyPrice, horizon, discountRate, transformerKm]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-[720px] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            🌞 Kalkulator Farmy PV
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6 p-6">
          {/* Left: Inputs */}
          <div className="space-y-5">
            <SliderInput
              label="POWIERZCHNIA POD PANELE (HA)"
              value={areaHa}
              min={0.5}
              max={50}
              step={0.1}
              onChange={setAreaHa}
            />

            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">MODEL PRZYCHODOWY</div>
              <div className="flex gap-1">
                {(["spot", "ppa", "auction"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => { setPricingModel(m); setEnergyPrice(PRICING_MODELS[m]); }}
                    className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      pricingModel === m
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {m === "spot" ? "Spot RCE" : m === "ppa" ? "PPA" : "Aukcja OZE"}
                  </button>
                ))}
              </div>
            </div>

            <SliderInput label="CENA ENERGII (PLN/MWH)" value={energyPrice} min={200} max={600} step={10} onChange={setEnergyPrice} />
            <SliderInput label="HORYZONT INWESTYCJI (LAT)" value={horizon} min={10} max={30} step={1} onChange={setHorizon} />
            <SliderInput label="STOPA DYSKONTA (%)" value={discountRate} min={4} max={12} step={1} onChange={setDiscountRate} />
            <SliderInput label="ODLEGŁOŚĆ OD STACJI SN (KM)" value={transformerKm} min={0} max={10} step={0.5} onChange={setTransformerKm} />
          </div>

          {/* Right: Results */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Metric icon="⚡" label="MOC INSTALACJI" value={`${calc.powerMwp.toFixed(2)} MWp`} />
              <Metric icon="🌞" label="PRODUKCJA ROCZNA" value={`${(calc.productionMwh / 1000).toFixed(0)} tys. MWh`} />
              <Metric icon="💰" label="PRZYCHÓD ROCZNY" value={formatPLN(calc.revenue)} color="text-green-600" />
              <Metric icon="🏗️" label="CAPEX" value={formatPLN(calc.capex)} color="text-red-500" />
              <Metric icon="⏱️" label="ZWROT INWESTYCJI" value={calc.payback < 100 ? `${calc.payback.toFixed(1)} lat` : "—"} color={calc.payback < 8 ? "text-green-600" : calc.payback < 12 ? "text-yellow-600" : "text-red-500"} />
              <Metric icon="📈" label="NPV" value={formatPLN(calc.npv)} color={calc.npv > 0 ? "text-green-600" : "text-red-500"} />
            </div>

            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">IRR (EST.)</div>
            <div className="text-xl font-bold text-blue-600">~12%</div>

            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-4">CASHFLOW NARASTAJĄCO</div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={calc.chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="rok" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} />
                  <Tooltip
                    formatter={(value) => [formatPLN(Number(value))]}
                    labelFormatter={(label) => `Rok ${label}`}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <ReferenceLine y={0} stroke="#999" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="cumulative" stroke="#3b82f6" strokeWidth={2} dot={false} name="Cashflow" />
                  <Line type="monotone" dataKey="capex" stroke="#ef4444" strokeWidth={1} strokeDasharray="5 5" dot={false} name="CAPEX" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {calc.breakEven && (
              <div className="text-xs text-gray-500">Break-even rok {calc.breakEven}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SliderInput({ label, value, min, max, step, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-20 text-right text-sm font-medium border border-gray-200 rounded px-2 py-1"
        />
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-600"
      />
    </div>
  );
}

function Metric({ icon, label, value, color }: { icon: string; label: string; value: string; color?: string }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <div className="text-[10px] text-gray-400 uppercase tracking-wider flex items-center gap-1">
        <span>{icon}</span> {label}
      </div>
      <div className={`text-sm font-bold mt-0.5 ${color || "text-gray-900"}`}>{value}</div>
    </div>
  );
}
