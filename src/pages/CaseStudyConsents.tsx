import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Search,
  Plus,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  ExternalLink,
  Sparkles,
  Lock,
  Eye,
  EyeOff,
  Building2,
  User,
  Share2,
  Calendar,
  X,
  FileCheck,
  Send,
  Kanban,
  FileText,
} from 'lucide-react';
import { ContentConsent, ConsentStatus, Client } from '../types';
import {
  getContentConsents,
  saveContentConsent,
  updateContentConsentStatus,
  getClients,
  saveContentItem,
} from '../services/db';
import { formatDateIndo, dateWITA } from '../utils/formatters';

export const CaseStudyConsents: React.FC = () => {
  const { userProfile } = useAuth();
  const isTimKonten = userProfile?.role === 'tim_konten';
  const isOwner = userProfile?.role === 'owner';

  const [consents, setConsents] = useState<ContentConsent[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal Request State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [requestForm, setRequestForm] = useState({
    caseStudyTitle: '',
    caseStudySummary: '',
    keyMetricsAchievement: '',
    industry: 'Food & Beverage',
    city: 'Denpasar, Bali',
    anonymizedName: '',
    anonymizedOwnerName: '',
    allowedChannels: ['LinkedIn', 'Instagram', 'Newsletter'],
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getContentConsents();
      setConsents(data);

      if (!isTimKonten) {
        const clientList = await getClients();
        setClients(clientList);
      }
    } catch (err) {
      console.error('Error loading consents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredConsents = consents.filter((c) => {
    const matchSearch =
      c.caseStudyTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.caseStudySummary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.anonymizedName && c.anonymizedName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.businessName && c.businessName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleOpenNewRequest = () => {
    if (clients.length > 0) {
      const first = clients[0];
      setSelectedClientId(first.id);
      setRequestForm({
        caseStudyTitle: `Transformasi Operasional & Kenaikan Margin ${first.namaBisnis}`,
        caseStudySummary: `Penerapan standarisasi SOP dan pembenahan tata kelola finansial terbukti menekan kebocoran biaya dan menaikkan laba bersih.`,
        keyMetricsAchievement: `+120% Laba Operasional, -15% Biaya Pemborosan, Efisiensi Jam Kerja Owner`,
        industry: first.industri || 'Food & Beverage',
        city: first.kota || 'Denpasar, Bali',
        anonymizedName: `Brand ${first.industri} Terkemuka di ${first.kota}`,
        anonymizedOwnerName: `Founder ${first.namaPemilik.split(' ')[0]} (Inisial ${first.namaPemilik.charAt(0)}.)`,
        allowedChannels: ['LinkedIn', 'Instagram', 'Newsletter'],
      });
    }
    setIsRequestModalOpen(true);
  };

  const handleClientSelectChange = (cId: string) => {
    setSelectedClientId(cId);
    const client = clients.find((c) => c.id === cId);
    if (client) {
      setRequestForm({
        ...requestForm,
        caseStudyTitle: `Transformasi Bisnis & Eksekusi Fundamental: ${client.namaBisnis}`,
        industry: client.industri || 'UKM Retail',
        city: client.kota || 'Bali',
        anonymizedName: `Brand ${client.industri} Berkembang di ${client.kota}`,
        anonymizedOwnerName: `Founder Inisial ${client.namaPemilik.charAt(0)}.${client.namaPemilik.split(' ')[1]?.charAt(0) || ''}`,
      });
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !requestForm.caseStudyTitle.trim()) return;

    const selectedClient = clients.find((c) => c.id === selectedClientId);

    const newConsent: ContentConsent = {
      id: `consent-${Date.now()}`,
      clientId: selectedClientId,
      clientName: selectedClient?.namaPemilik || 'Klien',
      businessName: selectedClient?.namaBisnis || 'Bisnis Klien',
      anonymizedName: requestForm.anonymizedName || `Entitas ${requestForm.industry} Terkemuka di ${requestForm.city}`,
      anonymizedOwnerName: requestForm.anonymizedOwnerName || 'Founder Klien',
      industry: requestForm.industry,
      city: requestForm.city,
      caseStudyTitle: requestForm.caseStudyTitle.trim(),
      caseStudySummary: requestForm.caseStudySummary.trim(),
      keyMetricsAchievement: requestForm.keyMetricsAchievement.trim(),
      status: 'Menunggu',
      requestedBy: userProfile?.displayName || 'Tim Konten',
      requestedAt: new Date().toISOString(),
      isAnonymizedDefault: true,
      allowedChannels: requestForm.allowedChannels,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveContentConsent(newConsent);
      setIsRequestModalOpen(false);
      setToastMessage('Permintaan izin studi kasus berhasil dikirim ke Portal Klien!');
      setTimeout(() => setToastMessage(null), 4000);
      loadData();
    } catch (err) {
      console.error('Error submitting consent request:', err);
    }
  };

  // Convert Approved Consent directly to Content Calendar Item
  const handleConvertToCalendar = async (consent: ContentConsent) => {
    try {
      const displayNameToUse =
        consent.status === 'Disetujui_Terbuka' && !consent.isAnonymizedDefault
          ? consent.businessName || consent.anonymizedName
          : consent.anonymizedName || 'Brand Binaan Nexus';

      const newContentId = `content-${Date.now()}`;
      await saveContentItem({
        id: newContentId,
        title: `Studi Kasus: ${consent.caseStudyTitle}`,
        type: 'konten_pemasaran',
        status: 'Ide',
        channel: consent.allowedChannels?.[0] || 'LinkedIn',
        publishDate: dateWITA(Date.now() + 7 * 86400000),
        authorId: userProfile?.id || 'user-1',
        authorName: userProfile?.displayName || 'Tim Konten',
        description: `Studi kasus berbasis persetujuan klien (${consent.status}).\nEntitas: ${displayNameToUse}\nHighlight: ${consent.keyMetricsAchievement || ''}\n\n${consent.caseStudySummary}`,
        category: 'Studi Kasus & Eksekusi',
        tags: [consent.industry || 'Business', 'CaseStudy', 'Growth'],
        format: 'Slide Deck',
        isLibraryMaterial: false,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setToastMessage('Item konten berhasil dibuat di Kalender Konten!');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Error converting to calendar:', err);
    }
  };

  const getStatusBadge = (status: ConsentStatus) => {
    switch (status) {
      case 'Disetujui_Anonim':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Disetujui_Terbuka':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'Menunggu':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Ditolak':
        return 'bg-red-50 text-red-800 border-red-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusLabel = (status: ConsentStatus) => {
    switch (status) {
      case 'Disetujui_Anonim':
        return 'Disetujui (Anonim)';
      case 'Disetujui_Terbuka':
        return 'Disetujui (Terbuka)';
      case 'Menunggu':
        return 'Menunggu Klien';
      case 'Ditolak':
        return 'Tidak Diizinkan';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Toast */}
      {toastMessage && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between text-xs font-semibold animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="p-1 hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-['Plus_Jakarta_Sans'] tracking-tight">
            Izin Publikasi Studi Kasus
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Persetujuan eksplisit dari klien sebelum data transformasi dan metrik pertumbuhan bisnis diolah menjadi konten edukasi publik. Secara bawaan (default), seluruh nama dan identitas disamarkan secara anonim.
          </p>
        </div>

        {!isTimKonten && (
          <button
            onClick={handleOpenNewRequest}
            className="inline-flex items-center gap-2 bg-[#00236f] text-white hover:bg-[#1e3a8a] px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Ajukan Izin Studi Kasus</span>
          </button>
        )}
      </div>

      {/* Security & Privacy Notice Card */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4.5 flex items-start gap-3.5 text-xs text-blue-950">
        <Lock className="w-5 h-5 text-[#00236f] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-[#00236f]">Protokol Privasi &amp; Penyamaran Anonim Bawaan</h4>
          <p className="text-slate-600 leading-relaxed">
            Data internal klien (rekam diagnosis, resep rahasia, notula sesi internal, dan laporan keuangan mentah) dienkripsi serta diproteksi oleh Security Rules. Tim konten hanya memiliki akses ke narasi studi kasus yang telah disetujui, dengan nama brand default diganti menjadi deskripsi industri anonim.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari judul studi kasus, industri, atau narasi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f]"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-bold uppercase text-xs">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f] cursor-pointer"
          >
            <option value="all">Semua Status</option>
            <option value="Disetujui_Anonim">Disetujui (Anonim)</option>
            <option value="Disetujui_Terbuka">Disetujui (Terbuka)</option>
            <option value="Menunggu">Menunggu Persetujuan</option>
            <option value="Ditolak">Ditolak</option>
          </select>
        </div>
      </div>

      {/* List of Consents */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs">Memuat daftar perizinan...</div>
      ) : filteredConsents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">Belum ada izin studi kasus</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Klik tombol "Ajukan Izin Studi Kasus" untuk meminta persetujuan publikasi data dari klien.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredConsents.map((consent) => {
            const isApproved =
              consent.status === 'Disetujui_Anonim' || consent.status === 'Disetujui_Terbuka';
            const isAnon = consent.isAnonymizedDefault || consent.status === 'Disetujui_Anonim';

            return (
              <div
                key={consent.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:shadow-md transition space-y-4"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                        isApproved
                          ? 'bg-emerald-50 text-emerald-700'
                          : consent.status === 'Menunggu'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{consent.caseStudyTitle}</h3>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                            consent.status
                          )}`}
                        >
                          {getStatusLabel(consent.status)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Diminta oleh <span className="font-semibold">{consent.requestedBy}</span> pada{' '}
                        {formatDateIndo(consent.requestedAt)}
                      </p>
                    </div>
                  </div>

                  {/* Anonymity Indicator Tag */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 self-start sm:self-auto">
                    {isAnon ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-purple-600" />
                        <span>Nama Disamarkan (Anonim)</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                        <span>Nama Terbuka (Publik)</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Identity Comparison: Real vs Sanitized Preview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Tampilan Nama dalam Publikasi Konten:
                    </span>
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-[#00236f]" />
                      <span>{isAnon ? consent.anonymizedName : consent.businessName || consent.anonymizedName}</span>
                    </div>
                    <div className="text-slate-500 text-xs">
                      Identitas Founder:{' '}
                      <span className="font-semibold text-slate-700">
                        {isAnon ? consent.anonymizedOwnerName : consent.clientName || consent.anonymizedOwnerName}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Saluran yang Diizinkan:
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {(consent.allowedChannels || ['LinkedIn', 'Instagram']).map((ch, idx) => (
                        <span
                          key={idx}
                          className="bg-white text-slate-700 font-semibold px-2 py-0.5 rounded-md border border-slate-200 text-xs"
                        >
                          {ch}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-slate-500">
                      Industri: <span className="font-semibold text-slate-700">{consent.industry}</span> ({consent.city})
                    </div>
                  </div>
                </div>

                {/* Key Metrics & Summary */}
                <div className="space-y-2 text-xs">
                  {consent.keyMetricsAchievement && (
                    <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                      <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                        Key Performance Growth Highlights:
                      </span>
                      <p className="font-bold text-emerald-950 mt-0.5 text-xs">
                        {consent.keyMetricsAchievement}
                      </p>
                    </div>
                  )}

                  <p className="text-slate-600 leading-relaxed text-xs">
                    {consent.caseStudySummary}
                  </p>

                  {/* Client response feedback if any */}
                  {consent.clientNotes && (
                    <div className="p-2.5 bg-slate-100 rounded-xl text-xs text-slate-700 border border-slate-200">
                      <span className="font-bold text-slate-900">Catatan Khusus dari Klien: </span>
                      "{consent.clientNotes}"
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    ID Ref: <span className="font-mono">{consent.id}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isApproved && (
                      <button
                        onClick={() => handleConvertToCalendar(consent)}
                        className="inline-flex items-center gap-1.5 bg-[#00236f] hover:bg-[#1e3a8a] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Jadwalkan ke Kalender Konten</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* REQUEST MODAL */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#00236f] flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Ajukan Izin Publikasi Studi Kasus</h3>
                  <p className="text-xs text-slate-500">Klien akan memverifikasi di portal sebelum konten tayang</p>
                </div>
              </div>
              <button
                onClick={() => setIsRequestModalOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="space-y-3.5 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pilih Klien Sasaran</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => handleClientSelectChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f] cursor-pointer"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.namaBisnis} - {c.namaPemilik} ({c.industri})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Judul Studi Kasus <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={requestForm.caseStudyTitle}
                  onChange={(e) => setRequestForm({ ...requestForm, caseStudyTitle: e.target.value })}
                  placeholder="Contoh: Reduksi Biaya Food Waste 12% & Restrukturisasi SOP Dapur"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Highlight Angka / Metrik Pertumbuhan</label>
                <input
                  type="text"
                  value={requestForm.keyMetricsAchievement}
                  onChange={(e) => setRequestForm({ ...requestForm, keyMetricsAchievement: e.target.value })}
                  placeholder="Contoh: +140% Laba Bersih, -12% Food Waste, 2 Store Manager Mandiri"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f]"
                />
              </div>

              {/* Anonymized Defaults */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-purple-50/50 rounded-xl border border-purple-100">
                <div>
                  <label className="block font-bold text-purple-900 mb-1">Nama Brand Samaran (Anonim)</label>
                  <input
                    type="text"
                    value={requestForm.anonymizedName}
                    onChange={(e) => setRequestForm({ ...requestForm, anonymizedName: e.target.value })}
                    placeholder="Brand F&B Terkemuka di Denpasar"
                    className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-purple-900 mb-1">Identitas Founder Samaran</label>
                  <input
                    type="text"
                    value={requestForm.anonymizedOwnerName}
                    onChange={(e) => setRequestForm({ ...requestForm, anonymizedOwnerName: e.target.value })}
                    placeholder="Founder M.A. (Pengusaha F&B)"
                    className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Narasi Ringkas Transformasi</label>
                <textarea
                  rows={3}
                  value={requestForm.caseStudySummary}
                  onChange={(e) => setRequestForm({ ...requestForm, caseStudySummary: e.target.value })}
                  placeholder="Uraikan problem awal, solusi pendampingan Nexus, dan hasil terukur..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00236f] hover:bg-[#1e3a8a] text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Kirim Permintaan ke Klien
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
