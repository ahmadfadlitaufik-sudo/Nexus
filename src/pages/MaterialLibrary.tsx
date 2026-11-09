import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Bookmark,
  Search,
  Filter,
  Plus,
  Layers,
  FileSpreadsheet,
  FileText,
  Video,
  CheckCircle2,
  ExternalLink,
  Users,
  Target,
  Send,
  Sparkles,
  ArrowRight,
  X,
  Clock,
  Building2,
  Check,
  Tag,
  Download,
} from 'lucide-react';
import { ContentItem, MaterialFormat, Client, Group } from '../types';
import {
  getContentItems,
  saveContentItem,
  getClients,
  getGroups,
  attachMaterialToClientRoadmap,
  attachMaterialToGroup,
} from '../services/db';

export const MaterialLibrary: React.FC = () => {
  const { userProfile } = useAuth();
  const [materials, setMaterials] = useState<ContentItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [formatFilter, setFormatFilter] = useState('all');

  // Attachment Modals State
  const [selectedMaterial, setSelectedMaterial] = useState<ContentItem | null>(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isNewMaterialModalOpen, setIsNewMaterialModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Client attachment form
  const [targetClientId, setTargetClientId] = useState('');
  const [targetWeek, setTargetWeek] = useState('Minggu 4');
  const [targetPhase, setTargetPhase] = useState('Fase 2: Standarisasi & SOP Operasional');

  // Group attachment form
  const [targetGroupId, setTargetGroupId] = useState('');
  const [groupNote, setGroupNote] = useState('');

  // New material form
  const [newForm, setNewForm] = useState({
    title: '',
    description: '',
    category: 'SOP Operasional',
    format: 'Template SOP' as MaterialFormat,
    fileUrl: '',
    externalUrl: '',
    tags: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const allItems = await getContentItems();
      // Filter library materials or materi_program items
      const libItems = allItems.filter((i) => i.isLibraryMaterial || i.type === 'materi_program');
      setMaterials(libItems);

      const clientList = await getClients();
      setClients(clientList);

      const groupList = await getGroups();
      setGroups(groupList);
    } catch (err) {
      console.error('Error loading library:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const categories = [
    'all',
    'SOP Operasional',
    'Finance & Cash Flow',
    'Leadership & HR',
    'Marketing Funnel',
    'Strategy & Framework',
  ];

  const formats = [
    'all',
    'Template SOP',
    'Worksheet',
    'PDF / E-Book',
    'Video Panduan',
    'Checklist',
    'Framework',
  ];

  const filteredMaterials = materials.filter((m) => {
    const matchSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.tags && m.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchCat = categoryFilter === 'all' || m.category === categoryFilter;
    const matchFmt = formatFilter === 'all' || m.format === formatFilter;
    return matchSearch && matchCat && matchFmt;
  });

  const handleOpenAttachClient = (mat: ContentItem) => {
    setSelectedMaterial(mat);
    if (clients.length > 0) setTargetClientId(clients[0].id);
    setIsClientModalOpen(true);
  };

  const handleOpenAttachGroup = (mat: ContentItem) => {
    setSelectedMaterial(mat);
    if (groups.length > 0) setTargetGroupId(groups[0].id);
    setGroupNote(`Silakan gunakan dan duplikasi template "${mat.title}" ini untuk implementasi di bisnis masing-masing.`);
    setIsGroupModalOpen(true);
  };

  const handleConfirmAttachClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial || !targetClientId) return;
    try {
      await attachMaterialToClientRoadmap(selectedMaterial, targetClientId, targetWeek, targetPhase);
      setIsClientModalOpen(false);
      const selectedClient = clients.find((c) => c.id === targetClientId);
      setSuccessToast(`Materi "${selectedMaterial.title}" berhasil dipasang ke Roadmap ${selectedClient?.namaBisnis || 'klien'}!`);
      setTimeout(() => setSuccessToast(null), 5000);
      loadData();
    } catch (err) {
      console.error('Error attaching to client:', err);
    }
  };

  const handleConfirmAttachGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial || !targetGroupId) return;
    try {
      await attachMaterialToGroup(
        selectedMaterial,
        targetGroupId,
        groupNote,
        userProfile?.displayName || 'Tim Konsultan Nexus'
      );
      setIsGroupModalOpen(false);
      const selectedGrp = groups.find((g) => g.id === targetGroupId);
      setSuccessToast(`Materi "${selectedMaterial.title}" berhasil dipasang ke Pengumuman Grup ${selectedGrp?.name || ''}!`);
      setTimeout(() => setSuccessToast(null), 5000);
      loadData();
    } catch (err) {
      console.error('Error attaching to group:', err);
    }
  };

  const handleCreateNewMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.title.trim()) return;
    try {
      const newItem: ContentItem = {
        id: `mat-${Date.now()}`,
        title: newForm.title.trim(),
        type: 'materi_program',
        status: 'Terbit',
        channel: 'Portal Internal',
        authorId: userProfile?.id || 'user-1',
        authorName: userProfile?.displayName || 'Tim Konsultan Nexus',
        description: newForm.description.trim(),
        category: newForm.category,
        format: newForm.format,
        fileUrl: newForm.fileUrl.trim(),
        externalUrl: newForm.externalUrl.trim(),
        tags: newForm.tags
          ? newForm.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        isLibraryMaterial: true,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveContentItem(newItem);
      setIsNewMaterialModalOpen(false);
      setNewForm({
        title: '',
        description: '',
        category: 'SOP Operasional',
        format: 'Template SOP',
        fileUrl: '',
        externalUrl: '',
        tags: '',
      });
      setSuccessToast(`Materi "${newItem.title}" berhasil ditambahkan ke Perpustakaan!`);
      setTimeout(() => setSuccessToast(null), 4000);
      loadData();
    } catch (err) {
      console.error('Error creating material:', err);
    }
  };

  const getFormatBadge = (fmt?: string) => {
    switch (fmt) {
      case 'Template SOP':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Worksheet':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'PDF / E-Book':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Video Panduan':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {successToast && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between text-xs font-semibold animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="p-1 hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#00236f] via-[#1e3a8a] to-[#0051d5] rounded-2xl p-6 sm:p-8 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 text-blue-100 text-xs font-semibold backdrop-blur-xs mb-3">
            <Bookmark className="w-3.5 h-3.5 text-amber-300" />
            <span>Knowledge Base &amp; Advisory Toolkits</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-['Plus_Jakarta_Sans'] tracking-tight">
            Perpustakaan Materi &amp; Framework
          </h1>
          <p className="text-sm text-blue-100 mt-1.5 max-w-2xl leading-relaxed">
            Kumpulan master template SOP, kalkulator spreadsheet keuangan, pedoman delegasi, dan playbook yang dapat langsung dipasang ke roadmap transformasi klien atau dibagikan ke forum grup.
          </p>
        </div>

        <button
          onClick={() => setIsNewMaterialModalOpen(true)}
          className="inline-flex items-center gap-2 bg-white text-[#00236f] hover:bg-blue-50 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Materi / Template Baru</span>
        </button>
      </div>

      {/* Search & Category Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari materi, spreadsheet, SOP, atau tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f]"
            />
          </div>

          {/* Format Select */}
          <select
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f] cursor-pointer"
          >
            <option value="all">Semua Format Materi</option>
            {formats.filter((f) => f !== 'all').map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-bold text-slate-400 mr-1 uppercase tracking-wider">Kategori:</span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-[#00236f] text-white font-bold shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat === 'all' ? 'Semua Kategori' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Materials Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Memuat perpustakaan materi...</div>
      ) : filteredMaterials.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <Bookmark className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">Materi tidak ditemukan</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Coba ubah kata kunci pencarian atau pilih kategori lain.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMaterials.map((mat) => (
            <div
              key={mat.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4 group relative"
            >
              <div className="space-y-3">
                {/* Header Category & Format Badges */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-[#0051d5] uppercase tracking-wider">
                    {mat.category || 'Materi Umum'}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getFormatBadge(
                      mat.format
                    )}`}
                  >
                    {mat.format || 'Dokumen'}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-[#00236f] transition">
                  {mat.title}
                </h3>

                {/* Description */}
                <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                  {mat.description}
                </p>

                {/* Tags */}
                {mat.tags && mat.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {mat.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-slate-50 text-slate-600 px-2 py-0.5 rounded-md font-medium border border-slate-100"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer Meta & Actions */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-600">
                    Oleh: {mat.authorName.split(',')[0]}
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
                    <Target className="w-3 h-3 text-blue-500" />
                    <span>{mat.usageCount || 0}x digunakan</span>
                  </span>
                </div>

                {/* Direct Link or Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => handleOpenAttachClient(mat)}
                    className="w-full inline-flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-[#00236f] px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span>Pasang ke Klien</span>
                  </button>

                  <button
                    onClick={() => handleOpenAttachGroup(mat)}
                    className="w-full inline-flex items-center justify-center gap-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Pasang ke Grup</span>
                  </button>
                </div>

                {/* Document Access URL Link if available */}
                {(mat.fileUrl || mat.externalUrl) && (
                  <a
                    href={mat.fileUrl || mat.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-1 text-[11px] text-slate-500 hover:text-[#00236f] hover:underline font-semibold pt-1"
                  >
                    <span>Buka Lembar / Dokumen Template</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: PASANG KE ROADMAP KLIEN */}
      {isClientModalOpen && selectedMaterial && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#00236f] flex items-center justify-center font-bold">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Pasang ke Roadmap Klien</h3>
                  <p className="text-[11px] text-slate-500">Materi akan otomatis menjadi item roadmap klien</p>
                </div>
              </div>
              <button
                onClick={() => setIsClientModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAttachClient} className="space-y-3.5 mt-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[10px] uppercase font-bold text-slate-400">Materi Terpilih:</div>
                <div className="font-bold text-slate-900 mt-0.5">{selectedMaterial.title}</div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Pilih Klien Sasaran</label>
                <select
                  value={targetClientId}
                  onChange={(e) => setTargetClientId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f] cursor-pointer"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.namaBisnis} ({c.namaPemilik} - {c.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Minggu Pelaksanaan</label>
                <input
                  type="text"
                  value={targetWeek}
                  onChange={(e) => setTargetWeek(e.target.value)}
                  placeholder="Contoh: Minggu 3-4"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Fase Roadmap</label>
                <input
                  type="text"
                  value={targetPhase}
                  onChange={(e) => setTargetPhase(e.target.value)}
                  placeholder="Contoh: Fase 2: Implementasi Standarisasi SOP"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00236f] hover:bg-[#1e3a8a] text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Pasang ke Roadmap
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PASANG KE GRUP / COHORT */}
      {isGroupModalOpen && selectedMaterial && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-900 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Bagikan ke Forum Grup</h3>
                  <p className="text-[11px] text-slate-500">Materi akan dipasang di tab pengumuman grup</p>
                </div>
              </div>
              <button
                onClick={() => setIsGroupModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAttachGroup} className="space-y-3.5 mt-4 text-xs">
              <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100">
                <div className="text-[10px] uppercase font-bold text-purple-500">Materi:</div>
                <div className="font-bold text-slate-900 mt-0.5">{selectedMaterial.title}</div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Pilih Grup Sasaran</label>
                <select
                  value={targetGroupId}
                  onChange={(e) => setTargetGroupId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f] cursor-pointer"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Pengantar untuk Anggota</label>
                <textarea
                  rows={3}
                  value={groupNote}
                  onChange={(e) => setGroupNote(e.target.value)}
                  placeholder="Berikan instruksi atau arahan pengerjaan template ini..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00236f] hover:bg-[#1e3a8a] text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Kirim ke Grup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: TAMBAH MATERI BARU */}
      {isNewMaterialModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#00236f] flex items-center justify-center font-bold">
                  <Bookmark className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Tambah Materi Perpustakaan</h3>
                  <p className="text-[11px] text-slate-500">Mendaftarkan template baru ke direktori internal</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewMaterialModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewMaterial} className="space-y-3.5 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Judul Materi / Template <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Spreadsheet Evaluasi Margin Resep & Waste F&B"
                  value={newForm.title}
                  onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={newForm.category}
                    onChange={(e) => setNewForm({ ...newForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f] cursor-pointer"
                  >
                    <option value="SOP Operasional">SOP Operasional</option>
                    <option value="Finance & Cash Flow">Finance & Cash Flow</option>
                    <option value="Leadership & HR">Leadership & HR</option>
                    <option value="Marketing Funnel">Marketing Funnel</option>
                    <option value="Strategy & Framework">Strategy & Framework</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Format Materi</label>
                  <select
                    value={newForm.format}
                    onChange={(e) => setNewForm({ ...newForm, format: e.target.value as MaterialFormat })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f] cursor-pointer"
                  >
                    <option value="Template SOP">Template SOP</option>
                    <option value="Worksheet">Worksheet / Kalkulator</option>
                    <option value="PDF / E-Book">PDF / E-Book</option>
                    <option value="Video Panduan">Video Panduan</option>
                    <option value="Checklist">Checklist</option>
                    <option value="Framework">Framework / Playbook</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Deskripsi Ringkas</label>
                <textarea
                  rows={2.5}
                  placeholder="Kegunaan template ini dan panduan singkat penggunaannya..."
                  value={newForm.description}
                  onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tautan File / Dokumen (Google Drive/Canva)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={newForm.externalUrl}
                    onChange={(e) => setNewForm({ ...newForm, externalUrl: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tags (pisahkan koma)</label>
                  <input
                    type="text"
                    placeholder="Inventory, F&B, Cost"
                    value={newForm.tags}
                    onChange={(e) => setNewForm({ ...newForm, tags: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewMaterialModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00236f] hover:bg-[#1e3a8a] text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan ke Perpustakaan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
