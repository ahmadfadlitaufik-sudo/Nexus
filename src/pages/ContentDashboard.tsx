import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  Calendar,
  Layers,
  Bookmark,
  ShieldCheck,
  TrendingUp,
  Clock,
  ArrowRight,
  Plus,
  FileText,
  Send,
  CheckCircle2,
  AlertCircle,
  EyeOff,
  Video,
  ExternalLink,
  Instagram,
  Linkedin,
  Youtube,
  Lock,
} from 'lucide-react';
import { ContentItem, ContentConsent } from '../types';
import { getContentItems, getContentConsents } from '../services/db';
import { formatDateIndo } from '../utils/formatters';
import { DailyActivityTracker } from '../components/DailyActivityTracker';

interface ContentDashboardProps {
  onNavigate: (tab: string) => void;
}

export const ContentDashboard: React.FC<ContentDashboardProps> = ({ onNavigate }) => {
  const { userProfile } = useAuth();
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [consents, setConsents] = useState<ContentConsent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const items = await getContentItems();
        setContentItems(items);
        const consentData = await getContentConsents();
        setConsents(consentData);
      } catch (err) {
        console.error('Error loading content dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Compute Metrics
  const totalItems = contentItems.length;
  const inProduction = contentItems.filter((i) => i.status === 'Produksi').length;
  const inReview = contentItems.filter((i) => i.status === 'Review').length;
  const scheduled = contentItems.filter((i) => i.status === 'Terjadwal').length;
  const published = contentItems.filter((i) => i.status === 'Terbit').length;
  const libraryMaterials = contentItems.filter((i) => i.isLibraryMaterial || i.type === 'materi_program').length;
  const activeConsents = consents.filter(
    (c) => c.status === 'Disetujui_Anonim' || c.status === 'Disetujui_Terbuka'
  ).length;

  const upcomingItems = contentItems
    .filter((i) => i.status === 'Terjadwal' || i.status === 'Produksi' || i.status === 'Review')
    .slice(0, 5);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Executive Strategic Banner */}
      <div className="bg-gradient-to-r from-[#00236f] via-[#1e3a8a] to-[#0051d5] rounded-2xl p-6 sm:p-8 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 text-blue-100 text-xs font-semibold backdrop-blur-xs mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Content Production &amp; Material Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-['Plus_Jakarta_Sans'] tracking-tight">
            Dashboard Tim Konten &amp; Media
          </h1>
          <p className="text-sm text-blue-100 mt-1.5 max-w-2xl leading-relaxed">
            Selamat datang, <span className="font-bold text-white">{userProfile?.displayName}</span>. Kelola ritme produksi konten edukasi bisnis, studi kasus anonim klien, dan perpustakaan modul pembelajaran.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => onNavigate('content-calendar')}
            className="inline-flex items-center gap-1.5 bg-white text-[#00236f] hover:bg-blue-50 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            <span>Buka Kalender Konten</span>
          </button>
        </div>
      </div>

      {/* Security Privacy Notice */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-blue-950">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#00236f] flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-[#00236f]">Akses Data Terisolasi &amp; Penyamaran Anonim</span>
            <p className="text-slate-600 text-[11px]">
              Sesuai Security Rules, data privat dan diagnosis rahasia klien tidak dapat diakses langsung. Publikasi studi kasus menggunakan data yang telah dianonimkan atas persetujuan klien.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('case-study-consents')}
          className="text-xs font-bold text-[#0051d5] hover:underline shrink-0 hidden sm:block"
        >
          Lihat Izin Studi Kasus →
        </button>
      </div>

      {/* Daily Activity Tracker for Content Team Standup & Check-in */}
      <DailyActivityTracker
        title="Daily Activity Tracker • Tim Konten & Media"
        defaultCollapsed={false}
      />

      {/* 4 Metric Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
        {/* Card 1: Pipeline Aktif */}
        <div
          onClick={() => onNavigate('content-calendar')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition cursor-pointer space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Dalam Produksi
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#00236f] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-['Plus_Jakarta_Sans'] text-slate-900">
              {inProduction}
            </span>
            <span className="text-xs text-slate-500 font-medium">konten</span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span>{inReview} sedang dalam review</span>
          </div>
        </div>

        {/* Card 2: Terjadwal */}
        <div
          onClick={() => onNavigate('content-calendar')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition cursor-pointer space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Siap / Terjadwal
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-['Plus_Jakarta_Sans'] text-slate-900">
              {scheduled}
            </span>
            <span className="text-xs text-slate-500 font-medium">konten</span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>{published} konten telah terbit</span>
          </div>
        </div>

        {/* Card 3: Perpustakaan Materi */}
        <div
          onClick={() => onNavigate('material-library')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition cursor-pointer space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Perpustakaan Materi
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Bookmark className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-['Plus_Jakarta_Sans'] text-slate-900">
              {libraryMaterials}
            </span>
            <span className="text-xs text-slate-500 font-medium">template &amp; SOP</span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
            <Layers className="w-3.5 h-3.5 text-[#00236f]" />
            <span>Siap dipasang ke roadmap</span>
          </div>
        </div>

        {/* Card 4: Izin Studi Kasus */}
        <div
          onClick={() => onNavigate('case-study-consents')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition cursor-pointer space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Izin Studi Kasus
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-['Plus_Jakarta_Sans'] text-slate-900">
              {activeConsents}
            </span>
            <span className="text-xs text-slate-500 font-medium">disetujui</span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
            <EyeOff className="w-3.5 h-3.5 text-purple-600" />
            <span>Anonim default &amp; aman</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Pipeline Upcoming + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Upcoming Content Items */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                Jadwal Produksi &amp; Publikasi Terdekat
              </h3>
              <p className="text-xs text-slate-500">Item konten yang sedang aktif berjalan di workflow</p>
            </div>

            <button
              onClick={() => onNavigate('content-calendar')}
              className="text-xs font-bold text-[#0051d5] hover:underline flex items-center gap-1 cursor-pointer"
            >
              Lihat Kalender Lengkap <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {upcomingItems.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Tidak ada konten yang sedang dalam antrean produksi.
              </div>
            ) : (
              upcomingItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:shadow-xs transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                        {item.channel}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.status === 'Terjadwal'
                            ? 'bg-purple-100 text-purple-800'
                            : item.status === 'Review'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{item.description}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-semibold text-slate-700">
                      {item.publishDate ? formatDateIndo(item.publishDate) : '-'}
                    </div>
                    <div className="text-[10px] text-slate-400">PIC: {item.authorName.split(' ')[0]}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 1 Col: Quick Feature Navigation Hub */}
        <div className="space-y-4">
          {/* Quick Nav Card 1: Kalender Konten */}
          <div
            onClick={() => onNavigate('content-calendar')}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-[#00236f] transition cursor-pointer space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#00236f] flex items-center justify-center font-bold">
                <Calendar className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#00236f] group-hover:translate-x-1 transition" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#00236f] transition">
              Papan &amp; Kalender Konten
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Pantau alur dari tahap Ide, Produksi, Review, Terjadwal, hingga Terbit.
            </p>
          </div>

          {/* Quick Nav Card 2: Perpustakaan Materi */}
          <div
            onClick={() => onNavigate('material-library')}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-[#00236f] transition cursor-pointer space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <Bookmark className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#00236f] group-hover:translate-x-1 transition" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#00236f] transition">
              Perpustakaan Materi
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Cari dan pasang master template SOP langsung ke roadmap klien atau sesi grup.
            </p>
          </div>

          {/* Quick Nav Card 3: Izin Studi Kasus */}
          <div
            onClick={() => onNavigate('case-study-consents')}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-[#00236f] transition cursor-pointer space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#00236f] group-hover:translate-x-1 transition" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#00236f] transition">
              Izin Studi Kasus (Anonim)
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Verifikasi persetujuan klien dan ubah data keberhasilan menjadi konten edukasi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
