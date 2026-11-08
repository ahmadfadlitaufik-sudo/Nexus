import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  Star,
  Users,
  Calendar,
  CheckCircle2,
  Smile,
  Award,
  Sparkles,
  BarChart3,
  PieChart as PieIcon,
  ChevronDown,
} from 'lucide-react';
import { Client, Session, Feedback } from '../types';

interface OwnerAnalyticsChartsProps {
  clients: Client[];
  sessions: Session[];
  feedbacks?: Feedback[];
}

export const OwnerAnalyticsCharts: React.FC<OwnerAnalyticsChartsProps> = ({
  clients,
  sessions,
  feedbacks = [],
}) => {
  const [periodFilter, setPeriodFilter] = useState<'6m' | 'ytd'>('6m');

  // 1. DATA PERTUMBUHAN KLIEN & JUMLAH SESI AKTIF (GRAFIK BATANG)
  // 6 Bulan Terakhir: Mei - Okt 2026
  const activeSessionsCount = sessions.filter((s) => s.status === 'Terjadwal').length;
  const completedSessionsCount = sessions.filter((s) => s.status === 'Selesai').length;
  const activeClientsCount = clients.filter((c) => c.status === 'Aktif').length;
  const onboardingClientsCount = clients.filter((c) => c.status === 'Onboarding').length;

  const barChartData6M = [
    {
      bulan: 'Mei',
      klienAktif: Math.max(3, activeClientsCount - 4),
      sesiSelesai: 14,
      sesiAktif: 4,
    },
    {
      bulan: 'Jun',
      klienAktif: Math.max(4, activeClientsCount - 3),
      sesiSelesai: 18,
      sesiAktif: 5,
    },
    {
      bulan: 'Jul',
      klienAktif: Math.max(5, activeClientsCount - 2),
      sesiSelesai: 22,
      sesiAktif: 6,
    },
    {
      bulan: 'Agu',
      klienAktif: Math.max(5, activeClientsCount - 1),
      sesiSelesai: 26,
      sesiAktif: 7,
    },
    {
      bulan: 'Sep',
      klienAktif: Math.max(6, activeClientsCount),
      sesiSelesai: 31,
      sesiAktif: Math.max(6, activeSessionsCount),
    },
    {
      bulan: 'Okt (Aktif)',
      klienAktif: activeClientsCount + onboardingClientsCount,
      sesiSelesai: Math.max(12, completedSessionsCount),
      sesiAktif: Math.max(8, activeSessionsCount),
    },
  ];

  const barChartDataYTD = [
    { bulan: 'Q1 (Jan-Mar)', klienAktif: 4, sesiSelesai: 42, sesiAktif: 6 },
    { bulan: 'Q2 (Apr-Jun)', klienAktif: 6, sesiSelesai: 56, sesiAktif: 9 },
    { bulan: 'Q3 (Jul-Sep)', klienAktif: 8, sesiSelesai: 79, sesiAktif: 12 },
    { bulan: 'Q4 (Okt-Des)', klienAktif: activeClientsCount + onboardingClientsCount, sesiSelesai: 32, sesiAktif: 14 },
  ];

  const currentBarData = periodFilter === '6m' ? barChartData6M : barChartDataYTD;

  // 2. DATA STATUS KEPUASAN KLIEN (PIE CHART / DONUT CHART)
  // Hitung distribusi bintang dari data feedback (fallback ke proporsi representatif)
  let rating5Count = 0;
  let rating4Count = 0;
  let rating3Count = 0;
  let ratingLowCount = 0;

  if (feedbacks.length > 0) {
    feedbacks.forEach((f) => {
      if (f.rating >= 5) rating5Count++;
      else if (f.rating === 4) rating4Count++;
      else if (f.rating === 3) rating3Count++;
      else ratingLowCount++;
    });
  } else {
    rating5Count = 18;
    rating4Count = 6;
    rating3Count = 2;
    ratingLowCount = 0;
  }

  const totalFeedbackCount = rating5Count + rating4Count + rating3Count + ratingLowCount;
  const satisfactionScore = totalFeedbackCount > 0
    ? (
        (rating5Count * 5 + rating4Count * 4 + rating3Count * 3 + ratingLowCount * 2) /
        totalFeedbackCount
      ).toFixed(1)
    : '4.8';

  const satisfactionPercentage = totalFeedbackCount > 0
    ? Math.round(((rating5Count + rating4Count) / totalFeedbackCount) * 100)
    : 94;

  const pieChartData = [
    {
      name: 'Sangat Puas (5★)',
      value: rating5Count,
      percentage: Math.round((rating5Count / totalFeedbackCount) * 100),
      color: '#10b981', // emerald-500
    },
    {
      name: 'Puas (4★)',
      value: rating4Count,
      percentage: Math.round((rating4Count / totalFeedbackCount) * 100),
      color: '#0051d5', // blue-600
    },
    {
      name: 'Cukup (3★)',
      value: rating3Count,
      percentage: Math.round((rating3Count / totalFeedbackCount) * 100),
      color: '#f59e0b', // amber-500
    },
    {
      name: 'Perlu Evaluasi (≤2★)',
      value: Math.max(0, ratingLowCount),
      percentage: Math.round((ratingLowCount / totalFeedbackCount) * 100),
      color: '#ef4444', // rose-500
    },
  ].filter((item) => item.value > 0);

  // Custom Tooltip untuk Bar Chart
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-xl border border-slate-700/80 text-xs space-y-1.5 backdrop-blur-xs">
          <div className="font-bold text-slate-200 border-b border-slate-700 pb-1 flex items-center justify-between gap-4">
            <span>Periode: {label}</span>
            <span className="text-[10px] text-blue-300 font-mono">WITA / 2026</span>
          </div>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4 py-0.5">
              <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                <span className="text-slate-300">{entry.name}:</span>
              </span>
              <span className="font-bold font-mono text-white">
                {entry.value} {entry.name.includes('Klien') ? 'Klien' : 'Sesi'}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip untuk Pie Chart
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1 backdrop-blur-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }}></span>
            <span className="font-bold">{data.name}</span>
          </div>
          <div className="text-[11px] text-slate-300">
            Jumlah Responden: <strong className="text-white">{data.value} ulasan</strong> ({data.percentage}%)
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* SECTION HEADER WITH CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#00236f]/10 text-[#00236f] flex items-center justify-center font-bold">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
              Analisis Pertumbuhan Klien &amp; Kinerja Sesi
            </h2>
            <p className="text-xs text-slate-500">
              Visualisasi metrik pertumbuhan kemitraan, frekuensi sesi pendampingan aktif, dan skor kepuasan (CSAT).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-semibold text-slate-600">
            <button
              onClick={() => setPeriodFilter('6m')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                periodFilter === '6m'
                  ? 'bg-white text-[#00236f] font-bold shadow-2xs'
                  : 'hover:text-slate-900'
              }`}
            >
              6 Bulan Terakhir
            </button>
            <button
              onClick={() => setPeriodFilter('ytd')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                periodFilter === 'ytd'
                  ? 'bg-white text-[#00236f] font-bold shadow-2xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Kuartal (YTD)
            </button>
          </div>
        </div>
      </div>

      {/* 2 BALANCED CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* CHART 1: GRAFIK BATANG PERTUMBUHAN KLIEN & JUMLAH SESI AKTIF (7 COLS) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0051d5]">
                  Volume &amp; Pertumbuhan
                </span>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans'] mt-0.5">
                  Pertumbuhan Klien &amp; Aktivitas Sesi Pendampingan
                </h3>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-[#00236f] border border-blue-100">
                Grafik Batang (Recharts)
              </span>
            </div>

            {/* Recharts Bar Chart Container */}
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={currentBarData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="bulan"
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: 12, fontSize: 11, fontWeight: 600 }}
                  />
                  <Bar
                    dataKey="klienAktif"
                    name="Klien Binaan"
                    fill="#00236f"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={28}
                  />
                  <Bar
                    dataKey="sesiSelesai"
                    name="Sesi Selesai"
                    fill="#0051d5"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={28}
                  />
                  <Bar
                    dataKey="sesiAktif"
                    name="Sesi Terjadwal"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 3 Metric Pills below Bar Chart */}
          <div className="grid grid-cols-3 gap-3 pt-4 mt-2 border-t border-slate-100 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Pertumbuhan Klien</span>
              <span className="text-sm font-bold text-[#00236f] flex items-center gap-1 mt-0.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> +18.4% MoM
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Sesi Selesai</span>
              <span className="text-sm font-bold text-[#0051d5] flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> {completedSessionsCount} Sesi
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Sesi Terjadwal</span>
              <span className="text-sm font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" /> {activeSessionsCount} Sesi Aktif
              </span>
            </div>
          </div>
        </div>

        {/* CHART 2: GRAFIK LINGKARAN (PIE CHART) - STATUS KEPUASAN KLIEN (5 COLS) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-md transition-all duration-200">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  Customer Satisfaction (CSAT)
                </span>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans'] mt-0.5">
                  Distribusi Kepuasan Klien
                </h3>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                Pie Chart (Recharts)
              </span>
            </div>

            {/* Pie Chart with Centered Metric Overlay */}
            <div className="relative h-56 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={88}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Centered Donut Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-extrabold text-slate-900 font-['Plus_Jakarta_Sans'] flex items-center gap-0.5">
                  {satisfactionScore}
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                </span>
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                  {satisfactionPercentage}% PUAS
                </span>
              </div>
            </div>

            {/* Custom Pie Legend Breakdown */}
            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
              {pieChartData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: item.color }}
                    ></span>
                    <span className="font-semibold text-slate-700">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-500 font-medium">{item.value} ulasan</span>
                    <span className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.2 rounded text-[11px]">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Satisfaction Quality Badge */}
          <div className="mt-4 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between text-xs text-emerald-950">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold">Standar Mutu Advisory: Sangat Baik</span>
            </div>
            <span className="font-bold text-[10px] uppercase tracking-wider bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
              NPS 92+
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
