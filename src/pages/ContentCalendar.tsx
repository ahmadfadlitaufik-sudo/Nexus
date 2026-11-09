import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Calendar as CalendarIcon,
  Kanban,
  Plus,
  Search,
  Filter,
  Layers,
  Sparkles,
  ExternalLink,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  Share2,
  Bookmark,
  FileText,
  Video,
  Instagram,
  Linkedin,
  Youtube,
  Send,
  MoreVertical,
  X,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ContentItem, ContentType, ContentStatus, ContentChannel, MaterialFormat } from '../types';
import { getContentItems, saveContentItem, updateContentItemStatus, deleteContentItem, getAllUsers } from '../services/db';
import { formatDateIndo, todayWITA } from '../utils/formatters';

const STATUS_COLUMNS: { id: ContentStatus; label: string; bg: string; border: string; badge: string }[] = [
  { id: 'Ide', label: 'Ide & Brainstorming', bg: 'bg-slate-50/70', border: 'border-slate-200', badge: 'bg-slate-100 text-slate-700' },
  { id: 'Produksi', label: 'Dalam Produksi', bg: 'bg-blue-50/40', border: 'border-blue-100', badge: 'bg-blue-100 text-blue-800' },
  { id: 'Review', label: 'Review & Revisi', bg: 'bg-amber-50/40', border: 'border-amber-100', badge: 'bg-amber-100 text-amber-800' },
  { id: 'Terjadwal', label: 'Terjadwal', bg: 'bg-purple-50/40', border: 'border-purple-100', badge: 'bg-purple-100 text-purple-800' },
  { id: 'Terbit', label: 'Telah Terbit', bg: 'bg-emerald-50/40', border: 'border-emerald-100', badge: 'bg-emerald-100 text-emerald-800' },
];

export const ContentCalendar: React.FC = () => {
  const { userProfile } = useAuth();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'board' | 'calendar'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | ContentType>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string }[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<ContentItem | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    type: 'konten_pemasaran' as ContentType,
    status: 'Ide' as ContentStatus,
    channel: 'Instagram' as ContentChannel,
    publishDate: todayWITA(),
    authorId: userProfile?.id || '',
    authorName: userProfile?.displayName || '',
    description: '',
    category: 'Marketing Funnel',
    tags: '',
    externalUrl: '',
    fileUrl: '',
    format: 'Slide Deck' as MaterialFormat,
    isLibraryMaterial: false,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getContentItems();
      setItems(data);
      const users = await getAllUsers();
      setTeamMembers(users.map((u) => ({ id: u.id, name: u.displayName })));
    } catch (err) {
      console.error('Error loading content items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenNewModal = (defaultStatus: ContentStatus = 'Ide', defaultDate?: string) => {
    setEditingItem(null);
    setFormData({
      title: '',
      type: 'konten_pemasaran',
      status: defaultStatus,
      channel: 'Instagram',
      publishDate: defaultDate || todayWITA(),
      authorId: userProfile?.id || '',
      authorName: userProfile?.displayName || 'Tim Konten',
      description: '',
      category: 'Marketing Funnel',
      tags: '',
      externalUrl: '',
      fileUrl: '',
      format: 'Slide Deck',
      isLibraryMaterial: false,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: ContentItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      type: item.type,
      status: item.status,
      channel: item.channel as ContentChannel,
      publishDate: item.publishDate || todayWITA(),
      authorId: item.authorId,
      authorName: item.authorName,
      description: item.description || '',
      category: item.category || 'Marketing Funnel',
      tags: (item.tags || []).join(', '),
      externalUrl: item.externalUrl || '',
      fileUrl: item.fileUrl || '',
      format: (item.format as MaterialFormat) || 'Slide Deck',
      isLibraryMaterial: !!item.isLibraryMaterial,
    });
    setIsModalOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    try {
      const itemToSave: ContentItem = {
        id: editingItem ? editingItem.id : `content-${Date.now()}`,
        title: formData.title.trim(),
        type: formData.type,
        status: formData.status,
        channel: formData.channel,
        publishDate: formData.publishDate,
        authorId: formData.authorId || userProfile?.id || 'user-1',
        authorName: formData.authorName || userProfile?.displayName || 'Tim Nexus',
        description: formData.description.trim(),
        category: formData.category,
        tags: formData.tags
          ? formData.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        externalUrl: formData.externalUrl.trim(),
        fileUrl: formData.fileUrl.trim(),
        format: formData.format,
        isLibraryMaterial: formData.isLibraryMaterial,
        usageCount: editingItem?.usageCount || 0,
        createdAt: editingItem?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveContentItem(itemToSave);
      setIsModalOpen(false);
      showToast(editingItem ? 'Perubahan konten berhasil disimpan!' : 'Konten baru berhasil ditambahkan!');
      loadData();
    } catch (err) {
      console.error('Error saving content item:', err);
      showToast('Gagal menyimpan konten. Coba beberapa saat lagi.');
    }
  };

  const handleStatusChange = async (itemId: string, newStatus: ContentStatus) => {
    try {
      await updateContentItemStatus(itemId, newStatus);
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, status: newStatus, updatedAt: new Date().toISOString() } : i))
      );
      showToast(`Status konten diubah menjadi: ${newStatus}`);
    } catch (err) {
      console.error('Error updating status:', err);
      showToast('Gagal memperbarui status konten.');
    }
  };

  const handlePromptDelete = (item: ContentItem) => {
    setItemToDelete(item);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeletingItem(true);
    try {
      await deleteContentItem(itemToDelete.id);
      setItems((prev) => prev.filter((i) => i.id !== itemToDelete.id));
      showToast(`Konten "${itemToDelete.title}" berhasil dihapus.`);
      setItemToDelete(null);
    } catch (err) {
      console.error('Error deleting item:', err);
      showToast('Gagal menghapus konten.');
    } finally {
      setIsDeletingItem(false);
    }
  };

  // Filtered items
  const filteredItems = items.filter((item) => {
    const matchQuery =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.authorName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === 'all' || item.type === typeFilter;
    const matchChannel = channelFilter === 'all' || item.channel === channelFilter;
    return matchQuery && matchType && matchChannel;
  });

  const getChannelIcon = (channel: string) => {
    switch (channel.toLowerCase()) {
      case 'instagram':
        return <Instagram className="w-3.5 h-3.5 text-pink-600" />;
      case 'linkedin':
        return <Linkedin className="w-3.5 h-3.5 text-blue-600" />;
      case 'youtube':
        return <Youtube className="w-3.5 h-3.5 text-red-600" />;
      case 'newsletter':
        return <Send className="w-3.5 h-3.5 text-indigo-600" />;
      case 'portal internal':
        return <Layers className="w-3.5 h-3.5 text-[#00236f]" />;
      default:
        return <Share2 className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  // Calendar Helpers
  const daysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-emerald-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center justify-between shadow-xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-white/80 hover:text-white cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-['Plus_Jakarta_Sans'] tracking-tight">
            Kalender Konten &amp; Publikasi
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Kelola perencanaan materi program pembinaan, konten pemasaran media sosial, dan studi kasus pertumbuhan klien UKM dalam satu alur terpusat.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Switch View Toggle */}
          <div className="bg-slate-200/70 p-1 rounded-xl flex items-center">
            <button
              onClick={() => setViewMode('board')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'board' ? 'bg-white text-[#00236f] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Papan Status</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'calendar' ? 'bg-white text-[#00236f] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Tampilan Kalender</span>
            </button>
          </div>

          <button
            onClick={() => handleOpenNewModal()}
            className="inline-flex items-center gap-1.5 bg-[#00236f] text-white hover:bg-[#1e3a8a] px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Konten Baru</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari judul, topik, saluran, atau PIC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f]"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                typeFilter === 'all' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Jenis
            </button>
            <button
              onClick={() => setTypeFilter('materi_program')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                typeFilter === 'materi_program' ? 'bg-white text-blue-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Materi Program
            </button>
            <button
              onClick={() => setTypeFilter('konten_pemasaran')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                typeFilter === 'konten_pemasaran' ? 'bg-white text-purple-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Konten Pemasaran
            </button>
          </div>

          {/* Channel Filter */}
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f] cursor-pointer"
          >
            <option value="all">Semua Saluran</option>
            <option value="Instagram">Instagram</option>
            <option value="LinkedIn">LinkedIn</option>
            <option value="YouTube">YouTube</option>
            <option value="TikTok">TikTok</option>
            <option value="Newsletter">Newsletter</option>
            <option value="Portal Internal">Portal Internal</option>
          </select>
        </div>

        <div className="text-xs font-semibold text-slate-500 shrink-0">
          Menampilkan <span className="text-slate-900 font-bold">{filteredItems.length}</span> item konten
        </div>
      </div>

      {/* VIEW 1: KANBAN BOARD */}
      {viewMode === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4.5 items-start">
          {STATUS_COLUMNS.map((col) => {
            const colItems = filteredItems.filter((i) => i.status === col.id);
            return (
              <div
                key={col.id}
                className={`${col.bg} border ${col.border} rounded-2xl p-3.5 flex flex-col md:min-h-[560px]`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{col.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${col.badge}`}>
                      {colItems.length}
                    </span>
                  </div>
                  <button
                    onClick={() => handleOpenNewModal(col.id)}
                    className="p-1 text-slate-500 hover:text-slate-700 hover:bg-white rounded-lg transition cursor-pointer"
                    title="Tambah ke status ini"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Items in Column */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colItems.length === 0 ? (
                    <div className="h-32 border-2 border-dashed border-slate-200/80 rounded-xl flex flex-col items-center justify-center text-slate-500 text-center p-3">
                      <p className="text-xs font-medium">Belum ada konten</p>
                      <button
                        onClick={() => handleOpenNewModal(col.id)}
                        className="mt-1 text-xs font-semibold text-[#0051d5] hover:underline cursor-pointer"
                      >
                        + Tambah Ide
                      </button>
                    </div>
                  ) : (
                    colItems.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs hover:shadow-md transition space-y-2.5 group relative"
                      >
                        {/* Channel & Type Badges */}
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="p-1 rounded-md bg-slate-50 border border-slate-100 flex items-center justify-center">
                              {getChannelIcon(item.channel)}
                            </span>
                            <span className="text-xs font-bold text-slate-600 truncate max-w-[85px]">
                              {item.channel}
                            </span>
                          </div>

                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              item.type === 'materi_program'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}
                          >
                            {item.type === 'materi_program' ? 'Materi' : 'Pemasaran'}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                          {item.title}
                        </h4>

                        {/* Description Preview */}
                        {item.description && (
                          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        )}

                        {/* Tags */}
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.tags.slice(0, 2).map((t, idx) => (
                              <span
                                key={idx}
                                className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Footer Info & PIC */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                          <div className="flex items-center gap-1 text-slate-600 font-medium">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>{item.publishDate ? formatDateIndo(item.publishDate) : '-'}</span>
                            {item.publishDate === todayWITA() && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-xs font-bold">
                                Hari Ini
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-slate-700 font-semibold truncate max-w-[80px]">
                            <User className="w-3 h-3 text-slate-500" />
                            <span className="truncate">{item.authorName.split(' ')[0]}</span>
                          </div>
                        </div>

                        {/* Quick Status Shift & Actions bar */}
                        <div className="pt-1.5 flex items-center justify-between border-t border-slate-100">
                          <select
                            value={item.status}
                            onChange={(e) => handleStatusChange(item.id, e.target.value as ContentStatus)}
                            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 focus:outline-none cursor-pointer"
                          >
                            <option value="Ide">Ide</option>
                            <option value="Produksi">Produksi</option>
                            <option value="Review">Review</option>
                            <option value="Terjadwal">Terjadwal</option>
                            <option value="Terbit">Terbit</option>
                          </select>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                              title="Edit Konten"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handlePromptDelete(item)}
                              className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                              title="Hapus Konten"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: CALENDAR VIEW */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          {/* Month Navigator */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 font-['Plus_Jakarta_Sans'] flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-[#00236f]" />
              <span>
                {monthNames[selectedMonth]} {selectedYear}
              </span>
            </h3>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <button
                onClick={() => {
                  setSelectedMonth(new Date().getMonth());
                  setSelectedYear(new Date().getFullYear());
                }}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
              >
                Bulan Ini
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-xl overflow-hidden border border-slate-200">
            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day, idx) => (
              <div key={idx} className="bg-slate-50 p-2.5 text-center text-xs font-bold text-slate-600">
                {day}
              </div>
            ))}

            {/* Empty slots for first week */}
            {Array.from({ length: firstDayOfMonth(selectedMonth, selectedYear) }).map((_, idx) => (
              <div key={`empty-${idx}`} className="bg-slate-50/50 min-h-[110px] p-2" />
            ))}

            {/* Month Days */}
            {Array.from({ length: daysInMonth(selectedMonth, selectedYear) }).map((_, idx) => {
              const day = idx + 1;
              const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayItems = filteredItems.filter((i) => i.publishDate === dateStr);
              const isToday =
                new Date().getDate() === day &&
                new Date().getMonth() === selectedMonth &&
                new Date().getFullYear() === selectedYear;

              return (
                <div
                  key={`day-${day}`}
                  className={`bg-white min-h-[110px] p-2 flex flex-col justify-between transition hover:bg-slate-50/60 ${
                    isToday ? 'ring-2 ring-blue-500 ring-inset bg-blue-50/20' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday ? 'bg-[#00236f] text-white' : 'text-slate-700'
                      }`}
                    >
                      {day}
                    </span>
                    <button
                      onClick={() => handleOpenNewModal('Terjadwal', dateStr)}
                      className="p-0.5 text-slate-300 hover:text-[#00236f] rounded transition cursor-pointer"
                      title="Tambah konten di tanggal ini"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="space-y-1.5 mt-1 overflow-y-auto max-h-[85px]">
                    {dayItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleOpenEditModal(item)}
                        className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center justify-between cursor-pointer hover:scale-[1.02] transition ${
                          item.status === 'Terbit'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : item.status === 'Terjadwal'
                            ? 'bg-purple-50 border-purple-200 text-purple-900'
                            : 'bg-blue-50 border-blue-200 text-blue-900'
                        }`}
                      >
                        <div className="flex items-center gap-1 truncate">
                          {getChannelIcon(item.channel)}
                          <span className="truncate">{item.title}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CREATE / EDIT CONTENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 my-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#00236f] flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingItem ? 'Edit Konten Publikasi' : 'Buat Item Konten Baru'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Isi detail rencana produksi, materi modul, atau materi promosi.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4 mt-5 text-xs">
              {/* Judul */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Judul Konten / Topik Materi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Breakdown SOP Restrukturisasi Food Waste Bali"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f]"
                />
              </div>

              {/* Jenis & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jenis Konten</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as ContentType })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f] cursor-pointer"
                  >
                    <option value="materi_program">Materi Program (Modul / Template / SOP)</option>
                    <option value="konten_pemasaran">Konten Pemasaran (Sosmed / Case Study / Media)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Tahapan</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as ContentStatus })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f] cursor-pointer"
                  >
                    <option value="Ide">Ide & Brainstorming</option>
                    <option value="Produksi">Dalam Produksi</option>
                    <option value="Review">Review & Revisi</option>
                    <option value="Terjadwal">Terjadwal</option>
                    <option value="Terbit">Telah Terbit</option>
                  </select>
                </div>
              </div>

              {/* Saluran & Tanggal Terbit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Saluran Distribusi</label>
                  <select
                    value={formData.channel}
                    onChange={(e) => setFormData({ ...formData, channel: e.target.value as ContentChannel })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f] cursor-pointer"
                  >
                    <option value="Instagram">Instagram (Carousel / Reels / Post)</option>
                    <option value="LinkedIn">LinkedIn (Article / Slide Deck)</option>
                    <option value="YouTube">YouTube (Longform / Podcast)</option>
                    <option value="TikTok">TikTok (Short Video)</option>
                    <option value="Newsletter">Newsletter (Nexus Digest)</option>
                    <option value="Portal Internal">Portal Internal (Materi Klien/Grup)</option>
                    <option value="Website">Website Case Study</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Rencana Terbit</label>
                  <input
                    type="date"
                    value={formData.publishDate}
                    onChange={(e) => setFormData({ ...formData, publishDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f]"
                  />
                </div>
              </div>

              {/* PIC Penanggung Jawab & Format */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Penanggung Jawab (PIC)</label>
                  <select
                    value={formData.authorId}
                    onChange={(e) => {
                      const found = teamMembers.find((m) => m.id === e.target.value);
                      setFormData({
                        ...formData,
                        authorId: e.target.value,
                        authorName: found ? found.name : formData.authorName,
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f] cursor-pointer"
                  >
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Format Output</label>
                  <select
                    value={formData.format}
                    onChange={(e) => setFormData({ ...formData, format: e.target.value as MaterialFormat })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f] cursor-pointer"
                  >
                    <option value="Slide Deck">Slide Deck / PDF</option>
                    <option value="Template SOP">Template SOP / Spreadsheet</option>
                    <option value="Video Panduan">Video Panduan</option>
                    <option value="Worksheet">Worksheet / Kalkulator</option>
                    <option value="Checklist">Checklist Evaluasi</option>
                    <option value="Framework">Playbook & Framework</option>
                  </select>
                </div>
              </div>

              {/* Deskripsi & Ringkasan */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Deskripsi &amp; Catatan Produksi</label>
                <textarea
                  rows={3}
                  placeholder="Rincian poin pembahasan, konsep visual, referensi, atau instruksi..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f]"
                />
              </div>

              {/* Tautan Materi / File URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tautan Eksternal (Canva/Notion/GDoc)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formData.externalUrl}
                    onChange={(e) => setFormData({ ...formData, externalUrl: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tags (pisahkan koma)</label>
                  <input
                    type="text"
                    placeholder="F&B, SOP, Finance, Instagram"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00236f]/20 focus:border-[#00236f]"
                  />
                </div>
              </div>

              {/* Masukkan ke Perpustakaan Materi */}
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Tambahkan ke Perpustakaan Materi?</div>
                  <div className="text-xs text-slate-600">
                    Materi ini dapat dicari dan dipasang langsung ke roadmap klien atau sesi grup.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.isLibraryMaterial}
                  onChange={(e) => setFormData({ ...formData, isLibraryMaterial: e.target.checked })}
                  className="w-4 h-4 text-[#00236f] rounded focus:ring-[#00236f] cursor-pointer"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00236f] hover:bg-[#1e3a8a] text-white rounded-xl font-bold transition shadow-xs cursor-pointer"
                >
                  {editingItem ? 'Simpan Perubahan' : 'Buat Item Konten'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Konfirmasi Hapus Konten */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in zoom-in-95 my-auto">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 text-center mb-1">
              Hapus Item Konten?
            </h3>
            <p className="text-xs text-slate-500 text-center mb-5">
              Apakah Anda yakin ingin menghapus konten <strong>"{itemToDelete.title}"</strong>? Tindakan ini akan menghapusnya secara permanen dari kalender dan database.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeletingItem}
                onClick={() => setItemToDelete(null)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition cursor-pointer text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeletingItem}
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition shadow-xs cursor-pointer text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isDeletingItem ? (
                  <span>Menghapus...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Hapus</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
