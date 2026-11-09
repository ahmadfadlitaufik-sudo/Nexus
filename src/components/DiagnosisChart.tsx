import React, { useState } from 'react';
import { Diagnosis } from '../types';
import { BarChart3, Radar, Sparkles, TrendingUp, ShieldAlert, Award } from 'lucide-react';

interface DiagnosisChartProps {
  diagnosis: Diagnosis | null;
}

export const DiagnosisChart: React.FC<DiagnosisChartProps> = ({ diagnosis }) => {
  const [chartType, setChartType] = useState<'bar' | 'radar'>('radar');

  if (!diagnosis) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-500">
        Belum ada data diagnosis 5 area untuk klien ini. Silakan isi diagnosis awal.
      </div>
    );
  }

  const areas = [
    { key: 'keuangan', label: 'Keuangan', data: diagnosis.keuangan, color: '#2563eb' },
    { key: 'pemasaran', label: 'Pemasaran', data: diagnosis.pemasaran, color: '#0ea5e9' },
    { key: 'operasional', label: 'Operasional', data: diagnosis.operasional, color: '#10b981' },
    { key: 'sdm', label: 'SDM & Organisasi', data: diagnosis.sdm, color: '#f59e0b' },
    { key: 'produk', label: 'Produk & Value', data: diagnosis.produk, color: '#8b5cf6' },
  ];

  const avgScore = (
    ((diagnosis.keuangan?.score || 0) +
      (diagnosis.pemasaran?.score || 0) +
      (diagnosis.operasional?.score || 0) +
      (diagnosis.sdm?.score || 0) +
      (diagnosis.produk?.score || 0)) /
    5
  ).toFixed(1);

  // Radar chart calculations for pentagon
  const size = 260;
  const center = size / 2;
  const radius = size * 0.38;
  const totalAngles = 5;

  // Generate grid levels (1 to 5)
  const gridLevels = [1, 2, 3, 4, 5];

  const getCoordinates = (index: number, value: number, maxVal = 5) => {
    const angle = (Math.PI * 2 / totalAngles) * index - Math.PI / 2;
    const r = (value / maxVal) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  const radarPoints = areas
    .map((item, idx) => {
      const { x, y } = getCoordinates(idx, item.data?.score || 1);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900">Visualisasi Diagnosis 5 Area Bisnis</h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Skor Rata-rata: {avgScore} / 5.0
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pemetaan kekuatan & area perbaikan fundamental bisnis klien
          </p>
        </div>

        {/* Chart View Toggle */}
        <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
          <button
            type="button"
            onClick={() => setChartType('radar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              chartType === 'radar'
                ? 'bg-white text-blue-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Radar className="w-3.5 h-3.5" />
            Grafik Radar
          </button>
          <button
            type="button"
            onClick={() => setChartType('bar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              chartType === 'bar'
                ? 'bg-white text-blue-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Grafik Batang
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Chart Area */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center p-4 bg-slate-50/70 rounded-2xl border border-slate-100 min-h-[300px]">
          {chartType === 'radar' ? (
            <div className="relative flex flex-col items-center">
              <svg width={size} height={size} className="overflow-visible">
                {/* Background Grid Pentagons */}
                {gridLevels.map((lvl) => {
                  const points = [0, 1, 2, 3, 4]
                    .map((idx) => {
                      const { x, y } = getCoordinates(idx, lvl);
                      return `${x},${y}`;
                    })
                    .join(' ');
                  return (
                    <polygon
                      key={lvl}
                      points={points}
                      fill={lvl === 5 ? '#f8fafc' : 'none'}
                      stroke="#e2e8f0"
                      strokeWidth="1"
                      strokeDasharray={lvl < 5 ? '2,2' : 'none'}
                    />
                  );
                })}

                {/* Axis lines from center to outer points */}
                {[0, 1, 2, 3, 4].map((idx) => {
                  const { x, y } = getCoordinates(idx, 5);
                  return (
                    <line
                      key={idx}
                      x1={center}
                      y1={center}
                      x2={x}
                      y2={y}
                      stroke="#cbd5e1"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Diagnosis Filled Polygon */}
                <polygon
                  points={radarPoints}
                  fill="rgba(30, 58, 138, 0.25)"
                  stroke="#1e3a8a"
                  strokeWidth="2.5"
                />

                {/* Score Points & Value Nodes */}
                {areas.map((item, idx) => {
                  const val = item.data?.score || 1;
                  const { x, y } = getCoordinates(idx, val);
                  const labelCoord = getCoordinates(idx, 5.8);
                  return (
                    <g key={item.key}>
                      <circle
                        cx={x}
                        cy={y}
                        r="5"
                        fill="#1e3a8a"
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="transition-all hover:r-7"
                      />
                      <text
                        x={labelCoord.x}
                        y={labelCoord.y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="text-xs font-bold fill-slate-700 select-none"
                      >
                        {item.label} ({val})
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          ) : (
            <div className="w-full space-y-4 px-2">
              {areas.map((item) => {
                const score = item.data?.score || 1;
                const pct = (score / 5) * 100;
                return (
                  <div key={item.key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">{item.label}</span>
                      <span className="font-bold text-blue-900">{score} / 5</span>
                    </div>
                    <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor:
                            score >= 4 ? '#10b981' : score >= 3 ? '#2563eb' : '#f59e0b',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Legend & Summary Cards */}
        <div className="lg:col-span-6 space-y-3">
          {areas.map((item) => {
            const score = item.data?.score || 1;
            const badgeBg =
              score >= 4
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : score >= 3
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-amber-50 text-amber-700 border-amber-200';

            return (
              <div
                key={item.key}
                className="p-3.5 rounded-xl border border-slate-100 bg-white hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">{item.label}</span>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                      {item.data?.notes || 'Belum ada catatan khusus pada area ini.'}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-md text-xs font-bold border ${badgeBg}`}
                  >
                    Skor {score}/5
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
