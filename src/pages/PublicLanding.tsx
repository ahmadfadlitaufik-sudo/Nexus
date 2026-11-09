import { ArrowRight, BadgeCheck, CalendarDays, CheckCircle2, Clock, LineChart, Lock, MessageCircle, Network, RefreshCw } from 'lucide-react';
import React, { useState } from 'react';

interface PublicLandingProps {
  onOpenLogin: () => void;
  isLoggedIn: boolean;
  onGoToDashboard: () => void;
}

export const PublicLanding: React.FC<PublicLandingProps> = ({
  onOpenLogin,
  isLoggedIn,
  onGoToDashboard,
}) => {
  const whatsappUrl =
    'https://wa.me/6282355522710?text=Halo%20Nexus%20Growth%20Partner,%20saya%20tertarik%20untuk%20konsultasi%20pendampingan%20bisnis%20WFA.';

  const [activeSection, setActiveSection] = useState<string>('tentang');

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 84;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="bg-[#f8f9ff] font-['Inter'] text-[#0b1c30] antialiased selection:bg-blue-100 selection:text-[#00236f] min-h-screen flex flex-col">
      {/* 1. TOP BAR CONTRACT */}
      <header className="fixed top-0 left-0 w-full z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 shadow-[0_1px_8px_rgba(0,0,0,0.03)] transition-all duration-300">
        <div className="h-20 max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-12 flex items-center justify-between">
          {/* Zone 1: Single Wordmark Branding */}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-3 group cursor-pointer"
          >
            <img
              src="/logo-mark.png"
              alt=""
              className="h-10 w-auto transition-transform duration-300 group-hover:scale-105"
            />
            <div className="flex flex-col">
              <span className="font-['Plus_Jakarta_Sans'] text-xl font-bold tracking-tight text-[#00236f] leading-none">
                Nexus Growth Partner
              </span>
              <span className="text-xs font-semibold text-slate-500 tracking-wider uppercase mt-1">
                Client Hub · Advisory WFA
              </span>
            </div>
          </a>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollToSection('tentang')}
              className={`nav-link text-sm transition-colors py-1 cursor-pointer ${
                activeSection === 'tentang'
                  ? 'text-[#00236f] font-bold'
                  : 'text-slate-600 hover:text-[#00236f] font-medium'
              }`}
            >
              Tentang Kami
            </button>
            <button
              onClick={() => scrollToSection('layanan')}
              className={`nav-link text-sm transition-colors py-1 cursor-pointer ${
                activeSection === 'layanan'
                  ? 'text-[#00236f] font-bold'
                  : 'text-slate-600 hover:text-[#00236f] font-medium'
              }`}
            >
              Layanan &amp; Program
            </button>
            <button
              onClick={() => scrollToSection('cara-kerja')}
              className={`nav-link text-sm transition-colors py-1 cursor-pointer ${
                activeSection === 'cara-kerja'
                  ? 'text-[#00236f] font-bold'
                  : 'text-slate-600 hover:text-[#00236f] font-medium'
              }`}
            >
              Cara Kerja
            </button>
            <button
              onClick={() => scrollToSection('kontak')}
              className={`nav-link text-sm transition-colors py-1 cursor-pointer ${
                activeSection === 'kontak'
                  ? 'text-[#00236f] font-bold'
                  : 'text-slate-600 hover:text-[#00236f] font-medium'
              }`}
            >
              Kontak
            </button>
          </nav>

          {/* Zone 3: Primary Action */}
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <button
                onClick={onGoToDashboard}
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#00236f] text-white text-xs sm:text-sm font-semibold shadow-sm hover:bg-[#1e3a8a] hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 cursor-pointer whitespace-nowrap"
              >
                Buka Dashboard
              </button>
            ) : (
              <button
                onClick={onOpenLogin}
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#00236f] text-white text-xs sm:text-sm font-semibold shadow-sm hover:bg-[#1e3a8a] hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 cursor-pointer whitespace-nowrap"
              >
                Masuk Client Hub
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTENT WITH SPACIOUS ARCHITECTURE */}
      <main className="w-full pt-20 flex-1">
        {/* HERO SECTION */}
        <section className="relative w-full overflow-hidden bg-gradient-to-b from-white via-[#eff4ff]/60 to-[#f8f9ff] py-16 lg:py-24 border-b border-slate-200/70">
          {/* Subtle ambient blur */}
          <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-blue-200/40 blur-3xl"></div>
          <div className="pointer-events-none absolute top-1/3 right-0 h-[480px] w-[480px] rounded-full bg-indigo-100/40 blur-3xl"></div>

          <div className="relative mx-auto max-w-[1280px] px-6 sm:px-8 lg:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
              {/* Left Column: Value Proposition */}
              <div className="lg:col-span-7 flex flex-col gap-6">
                {/* Unboxed Status Kicker */}
                <div className="flex items-center gap-2 text-xs font-semibold text-[#00236f] tracking-wide">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Program Pendampingan 2025–2026</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-600 font-normal">Metode Kolaborasi WFA Terstruktur</span>
                </div>

                {/* Hero Title */}
                <h1 className="font-['Plus_Jakarta_Sans'] text-3xl sm:text-4xl lg:text-[50px] text-[#0b1c30] tracking-tight leading-[1.18] font-bold text-balance">
                  Membantu Pemilik Bisnis Bertumbuh Lewat{' '}
                  <span className="text-[#00236f] underline decoration-[#b4c5ff] decoration-wavy decoration-2 underline-offset-8">
                    Pendampingan Terstruktur
                  </span>{' '}
                  &amp; Mentoring Privat
                </h1>

                {/* Body Prose */}
                <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
                  Kami mendampingi para pendiri usaha UKM dan dewan direksi merapikan fondasi
                  operasional, menata arus kas, membangun SOP mandiri, dan mengakselerasi
                  kinerja bisnis secara terukur dari jarak jauh (WFA).
                </p>

                {/* CTAs */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <a
                    href={whatsappUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#00236f] text-white text-sm font-semibold shadow-md hover:bg-[#1e3a8a] hover:-translate-y-0.5 hover:shadow-xl transition-all duration-200 cursor-pointer"
                  >
                    <span>Jadwalkan Konsultasi Awal</span>
                    <ArrowRight className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
                  </a>

                  <button
                    onClick={isLoggedIn ? onGoToDashboard : onOpenLogin}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white text-[#00236f] text-sm font-semibold shadow-xs border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all duration-200 cursor-pointer"
                  >
                    <Lock className="w-[18px] h-[18px] shrink-0 text-[#00236f]" aria-hidden="true" />
                    <span>{isLoggedIn ? 'Masuk ke Dashboard' : 'Portal Klien (Login)'}</span>
                  </button>
                </div>

              </div>

              {/* Right Column: High-Fidelity Client Hub Preview Card */}
              <div className="lg:col-span-5 relative">
                <div className="hero-floating-card bg-white rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden p-6 lg:p-7">
                  {/* Window Meta Bar */}
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                      <span className="text-xs text-slate-400 ml-2 font-mono">
                        nexus.id/hub/client-360
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md">
                      Aktif · Sesi Q1
                    </span>
                  </div>

                  {/* Client Highlight */}
                  <div className="bg-[#eff4ff] p-4 rounded-xl mb-5 flex items-center justify-between border border-blue-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#00236f] text-white flex items-center justify-center font-bold text-sm font-['Plus_Jakarta_Sans']">
                        PT
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                          Contoh: Usaha Anda
                        </h4>
                        <p className="text-xs text-slate-500">Ilustrasi tampilan Client Hub</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400 font-medium">Progres Rapor</div>
                      <div className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#00236f] tabular-nums">
                        78.4%
                      </div>
                    </div>
                  </div>

                  {/* Milestone Checklist */}
                  <div className="space-y-2.5">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Pelacak Milestone &amp; Indikator
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CheckCircle2 className="w-[18px] h-[18px] shrink-0 text-emerald-600" aria-hidden="true" />
                        <div className="truncate">
                          <div className="text-xs font-semibold text-slate-800 truncate">
                            Audit Struktur Biaya Operasional (COGS)
                          </div>
                          <div className="text-xs text-slate-400">Disetujui Lead Advisor</div>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded shrink-0">
                        Selesai
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <RefreshCw className="w-[18px] h-[18px] shrink-0 text-amber-600" aria-hidden="true" />
                        <div className="truncate">
                          <div className="text-xs font-semibold text-slate-800 truncate">
                            Restrukturisasi KPI Tim Penjualan
                          </div>
                          <div className="text-xs text-slate-400">Minggu ke-4 dari 6</div>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded shrink-0">
                        Berjalan
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Clock className="w-[18px] h-[18px] shrink-0 text-rose-500" aria-hidden="true" />
                        <div className="truncate">
                          <div className="text-xs font-semibold text-slate-800 truncate">
                            Penyusunan Matriks Finansial Q2
                          </div>
                          <div className="text-xs text-slate-400">Menunggu data akuntansi</div>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded shrink-0">
                        Terlambat
                      </span>
                    </div>
                  </div>

                  {/* Footnote */}
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-medium text-[#00236f]">
                      <BadgeCheck className="w-4 h-4 shrink-0 text-blue-600" aria-hidden="true" />
                      Standar Protokol Nexus
                    </span>
                    <span className="text-xs text-slate-400">Zona Waktu WITA</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: TENTANG KAMI */}
        <section className="w-full bg-white py-20 lg:py-28 border-b border-slate-200/70" id="tentang">
          <div className="mx-auto max-w-[1280px] px-6 sm:px-8 lg:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
              <div className="lg:col-span-5 space-y-5">
                <span className="text-xs font-bold text-[#0051d5] uppercase tracking-wider">
                  Tentang Nexus Growth Partner
                </span>
                <h2 className="font-['Plus_Jakarta_Sans'] text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-snug">
                  Mitra Pendampingan Bisnis Jarak Jauh (WFA) yang Berorientasi Hasil
                </h2>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  Kami menjembatani kesenjangan manajemen bisnis di berbagai wilayah Indonesia
                  dengan menghadirkan bimbingan praktisi berpengalaman langsung ke meja kerja Anda
                  secara daring.
                </p>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  Fokus kami adalah transformasi nyata: pemisahan rekening bisnis &amp; kas pribadi,
                  penyusunan SOP kunci yang mudah didelegasikan, penetapan KPI tim yang adil, dan
                  pencapaian target pendapatan secara terencana.
                </p>

                <div className="pt-4 grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-[#00236f]">
                      12 Minggu
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Siklus Program Transformasi</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-[#00236f]">
                      WITA
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Sinkronisasi Jam Kerja UKM</div>
                  </div>
                </div>
              </div>

              {/* 3 Keunggulan Pendampingan WFA */}
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl bg-[#eff4ff]/60 border border-blue-100 flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-[#00236f] text-white flex items-center justify-center mb-4">
                      <CalendarDays className="w-5 h-5 shrink-0" aria-hidden="true" />
                    </div>
                    <span className="text-xs font-mono font-bold text-[#0051d5] uppercase">
                      01 · WFA
                    </span>
                    <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900 mt-1 mb-2">
                      Akses Fleksibel
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Sesi 1-on-1 via Google Meet terjadwal tanpa repot perjalanan luar kota.
                    </p>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-[#eff4ff]/60 border border-blue-100 flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-[#00236f] text-white flex items-center justify-center mb-4">
                      <Network className="w-5 h-5 shrink-0" aria-hidden="true" />
                    </div>
                    <span className="text-xs font-mono font-bold text-[#0051d5] uppercase">
                      02 · Kurikulum
                    </span>
                    <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900 mt-1 mb-2">
                      Tahapan Rapi
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Modul terstandarisasi, template siap pakai, dan action items berbatas waktu.
                    </p>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-[#eff4ff]/60 border border-blue-100 flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-[#00236f] text-white flex items-center justify-center mb-4">
                      <LineChart className="w-5 h-5 shrink-0" aria-hidden="true" />
                    </div>
                    <span className="text-xs font-mono font-bold text-[#0051d5] uppercase">
                      03 · Evaluasi
                    </span>
                    <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900 mt-1 mb-2">
                      Hasil Terukur
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Pantauan KPI riil &amp; rapor berkala untuk memastikan akselerasi bisnis Anda.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: PROGRAM & LAYANAN (STRUCTURED SERVICE CARDS) */}
        <section className="w-full bg-[#f8f9ff] py-20 lg:py-28 border-b border-slate-200/70" id="layanan">
          <div className="mx-auto max-w-[1280px] px-6 sm:px-8 lg:px-12">
            {/* Section Header */}
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
              <span className="text-xs font-bold text-[#0051d5] uppercase tracking-wider">
                Program Pendampingan
              </span>
              <h2 className="font-['Plus_Jakarta_Sans'] text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                Pilihan Layanan Sesuai Fase Usaha
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Dua format pendampingan intensif yang dirancang untuk membenahi pondasi dan
                mempersiapkan bisnis Anda melangkah ke tingkat berikutnya.
              </p>
            </div>

            {/* 2 Major Service Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 max-w-5xl mx-auto">
              {/* Card 1: Pendampingan Fundamental */}
              <div className="bg-white rounded-3xl p-8 lg:p-10 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 text-[#00236f] border border-blue-200">
                      Program 12 Minggu · 12 Sesi
                    </span>
                    <span className="text-xs text-slate-500 font-medium">Fundamental UKM</span>
                  </div>

                  <div>
                    <h3 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-slate-900">
                      Pendampingan Fundamental
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                      Program terstruktur langkah-demi-langkah untuk membangun fondasi manajemen
                      usaha yang sehat: pemisahan keuangan, SOP operasional mandiri, dan kesiapan tim.
                    </p>
                  </div>

                  {/* Price Box */}
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <div className="text-xs text-slate-500 font-medium">Investasi Program</div>
                    <a
                      href={`https://wa.me/6282355522710?text=${encodeURIComponent('Halo Nexus Growth Partner, saya ingin tahu biaya program Pendampingan Fundamental.')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#00236f]/30 hover:border-[#00236f] text-[#00236f] text-sm font-bold transition"
                    >
                      <MessageCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                      Tanya Harga via WhatsApp
                    </a>
                    <div className="text-xs text-slate-500 mt-1">
                      Termasuk 12 sesi Google Meet, modul, template kerja, &amp; akses Client Hub.
                    </div>
                  </div>

                  {/* Target Profile */}
                  <div className="text-xs text-slate-600 bg-blue-50/50 p-3.5 rounded-xl border border-blue-100">
                    <strong className="text-[#00236f]">Cocok untuk:</strong> Pemilik bisnis yang
                    ingin usahanya tetap berjalan rapi tanpa harus selalu ditunggui setiap hari.
                  </div>

                  {/* Deliverables Checklist */}
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Cakupan Pendampingan:
                    </div>
                    <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600">
                      {[
                        'Audit diagnostik 5 area: Keuangan, Pemasaran, Operasional, SDM, & Produk',
                        'Roadmap transformasi bisnis mingguan yang disesuaikan',
                        'Sesi pendampingan 1x per minggu (60-75 menit per sesi)',
                        'Pemberian template SOP, COGS kalkulator, dan matriks pendelegasian tugas',
                        'Action items otomatis menjadi tugas di portal klien',
                      ].map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-[18px] h-[18px] shrink-0 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-8">
                  <a
                    href={`${whatsappUrl}%20Saya%20tertarik%20dengan%20Pendampingan%20Fundamental.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 bg-[#00236f] hover:bg-[#1e3a8a] text-white font-semibold py-3.5 px-5 rounded-xl text-sm transition shadow-sm"
                  >
                    <span>Daftar Konsultasi Program</span>
                    <ArrowRight className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
                  </a>
                </div>
              </div>

              {/* Card 2: Mentoring Private */}
              <div className="bg-white rounded-3xl p-8 lg:p-10 border-2 border-[#0051d5] shadow-md hover:shadow-lg transition-all flex flex-col justify-between relative">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-blue-100 text-[#00236f] border border-blue-300">
                      Program 8 Minggu · 8 Sesi
                    </span>
                    <span className="text-xs font-bold text-[#0051d5] uppercase tracking-wider">
                      Eksklusif 1-on-1
                    </span>
                  </div>

                  <div>
                    <h3 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-slate-900">
                      Mentoring Private
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                      Pendampingan privat langsung dengan Senior Business Partner untuk membedah
                      bottleneck spesifik, restrukturisasi biaya, dan pengambilan keputusan strategis.
                    </p>
                  </div>

                  {/* Price Box */}
                  <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200">
                    <div className="text-xs text-[#00236f] font-medium">Investasi Program</div>
                    <a
                      href={`https://wa.me/6282355522710?text=${encodeURIComponent('Halo Nexus Growth Partner, saya ingin tahu biaya program Mentoring Private.')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00236f] hover:bg-[#1e3a8a] text-white text-sm font-bold transition"
                    >
                      <MessageCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                      Tanya Harga via WhatsApp
                    </a>
                    <div className="text-xs text-slate-600 mt-1">
                      Sesi privat intensif dengan slot terbatas (maksimal 5 klien per kuartal).
                    </div>
                  </div>

                  {/* Target Profile */}
                  <div className="text-xs text-slate-600 bg-blue-50/50 p-3.5 rounded-xl border border-blue-100">
                    <strong className="text-[#00236f]">Cocok untuk:</strong> Founder &amp; CEO yang
                    menghadapi fase ekspansi cabang, penurunan margin kas, atau restrukturisasi tim.
                  </div>

                  {/* Deliverables Checklist */}
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Cakupan Pendampingan:
                    </div>
                    <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600">
                      {[
                        'Sesi private 1-on-1 mingguan 75-90 menit bersama Senior Advisor',
                        'Bedah laporan keuangan mendalam, perputaran piutang, dan efisiensi rantai pasok',
                        'Akses prioritas pesan instan WhatsApp langsung ke konsultan pendamping',
                        'Penyusunan Executive KPI Dashboard & target pertumbuhan omzet',
                        'Perjanjian Kerahasiaan Data Bisnis (NDA) terlindungi penuh',
                      ].map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <BadgeCheck className="w-[18px] h-[18px] shrink-0 text-[#0051d5] shrink-0 mt-0.5" aria-hidden="true" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-8">
                  <a
                    href={`${whatsappUrl}%20Saya%20tertarik%20dengan%20Mentoring%20Private.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 bg-[#0051d5] hover:bg-[#003ea8] text-white font-semibold py-3.5 px-5 rounded-xl text-sm transition shadow-md"
                  >
                    <span>Ajukan Mentoring Private</span>
                    <ArrowRight className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: CARA KERJA */}
        <section className="w-full bg-white py-20 lg:py-28 border-b border-slate-200/70" id="cara-kerja">
          <div className="mx-auto max-w-[1280px] px-6 sm:px-8 lg:px-12">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
              <span className="text-xs font-bold text-[#0051d5] uppercase tracking-wider">
                Alur Pendampingan
              </span>
              <h2 className="font-['Plus_Jakarta_Sans'] text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                5 Tahap Eksekusi Menuju Hasil Nyata
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Metodologi sistematis yang memastikan setiap perbaikan terencana dengan rapi dan
                dieksekusi secara konsisten.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {[
                {
                  step: '01',
                  title: 'Konsultasi Awal',
                  desc: 'Diskusi penjajakan untuk memetakan tantangan utama dan sasaran pertumbuhan bisnis.',
                },
                {
                  step: '02',
                  title: 'Diagnosis Bisnis',
                  desc: 'Audit mendalam 5 pilar fundamental (keuangan, pemasaran, operasional, SDM, produk).',
                },
                {
                  step: '03',
                  title: 'Roadmap Strategi',
                  desc: 'Penyusunan tahapan milestone mingguan yang realistis dan terukur sesuai kapasitas tim.',
                },
                {
                  step: '04',
                  title: 'Sesi Pendampingan',
                  desc: 'Tatap muka berkala via Google Meet untuk evaluasi data riil dan penerjemahan tugas operasional.',
                },
                {
                  step: '05',
                  title: 'Evaluasi & Skala',
                  desc: 'Pengukuran kenaikan KPI bisnis dan standarisasi sistem untuk persiapan ekspansi berkelanjutan.',
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-[#00236f] text-white flex items-center justify-center font-bold text-sm font-['Plus_Jakarta_Sans'] mb-4">
                      {item.step}
                    </div>
                    <h4 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-slate-900 mb-2">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION: CTA BANNER */}
        <section className="w-full bg-[#f8f9ff] py-16 lg:py-24" id="kontak">
          <div className="mx-auto max-w-[1280px] px-6 sm:px-8 lg:px-12">
            <div className="relative overflow-hidden rounded-3xl bg-[#00236f] p-8 sm:p-12 lg:p-16 text-white shadow-xl">
              <div className="shimmer-active pointer-events-none absolute inset-0 z-0 opacity-40"></div>

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                <div className="max-w-2xl space-y-3">
                  <span className="inline-block text-xs font-bold text-blue-200 uppercase tracking-wider">
                    Konsultasi Pendampingan Bisnis
                  </span>
                  <h2 className="font-['Plus_Jakarta_Sans'] text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight">
                    Siap Membangun Fondasi Bisnis yang Tangguh dan Bertumbuh?
                  </h2>
                  <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed pt-1">
                    Diskusikan kondisi usaha Anda bersama tim konsultan Nexus Growth Partner. Kami
                    siap membantu Anda menyusun peta jalan perbaikan yang terarah.
                  </p>
                </div>

                <div className="shrink-0 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-[#00236f] text-sm sm:text-base font-bold shadow-lg hover:bg-blue-50 transition-all cursor-pointer whitespace-nowrap"
                  >
                    <MessageCircle className="w-[22px] h-[22px] shrink-0 text-emerald-600" aria-hidden="true" />
                    <span>Hubungi via WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-slate-900 text-slate-400 py-14 border-t border-slate-800 text-xs sm:text-sm">
        <div className="max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-800">
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <img src="/logo-mark-white.png" alt="" className="h-9 w-auto" />
                <span className="text-lg font-bold text-white font-['Plus_Jakarta_Sans']">
                  Nexus Growth Partner
                </span>
              </div>
              <p className="text-slate-400 max-w-sm leading-relaxed text-xs">
                Mitra konsultan pendampingan bisnis WFA untuk pemilik bisnis dan UKM di seluruh
                Indonesia. Membantu standarisasi operasional dan pertumbuhan terukur.
              </p>
              <div className="text-xs text-blue-400 font-medium">
                Zona Waktu Layanan: 09:00 - 18:00 WITA (Senin - Jumat)
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-white font-semibold font-['Plus_Jakarta_Sans']">Layanan Utama</div>
              <ul className="space-y-2 text-xs">
                <li>Pendampingan Fundamental (12 Minggu)</li>
                <li>Mentoring Private (8 Minggu)</li>
                <li>Audit Diagnostik 5 Area Bisnis</li>
                <li>Penyusunan SOP &amp; Executive KPI</li>
              </ul>
            </div>

            <div className="space-y-3">
              <div className="text-white font-semibold font-['Plus_Jakarta_Sans']">Kontak</div>
              <ul className="space-y-2 text-xs">
                <li>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white"
                  >
                    +62 823-5552-2710 (WhatsApp)
                  </a>
                </li>
                <li>Hub WFA: Denpasar · Balikpapan · Makassar (WITA)</li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <div>&copy; 2026 Nexus Growth Partner. Seluruh Hak Cipta Dilindungi.</div>
            <div>Platform resmi Nexus Client Hub</div>
          </div>
        </div>
      </footer>
    </div>
  );
};
