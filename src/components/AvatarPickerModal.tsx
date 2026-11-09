import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  Link as LinkIcon,
  Sparkles,
  Check,
  X,
  User,
  RefreshCw,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { UserProfile } from '../types';

// Curated high quality presets categorized for Nexus team & clients
const AVATAR_PRESETS = [
  // 1. Eksekutif & Konsultan
  {
    category: 'Konsultan & Eksekutif',
    items: [
      {
        label: 'Eksekutif Pria 1',
        url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
      },
      {
        label: 'Eksekutif Wanita 1',
        url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
      },
      {
        label: 'Eksekutif Pria 2',
        url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
      },
      {
        label: 'Eksekutif Wanita 2',
        url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
      },
      {
        label: 'Managing Partner',
        url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      },
      {
        label: 'Senior Advisor',
        url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80',
      },
    ],
  },
  // 2. Tim Kreatif & Fasilitator Grup
  {
    category: 'Tim Kreatif & Fasilitator',
    items: [
      {
        label: 'Fasilitator 1',
        url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
      },
      {
        label: 'Tim Konten 1',
        url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
      },
      {
        label: 'Spesialis Kreatif',
        url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
      },
      {
        label: 'Media Strategist',
        url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&auto=format&fit=crop&q=80',
      },
      {
        label: 'Staf Operasional',
        url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
      },
      {
        label: 'Desainer Grafis',
        url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
      },
    ],
  },
  // 3. Klien UKM & Founder Bisnis
  {
    category: 'Klien UKM & Founder Bisnis',
    items: [
      {
        label: 'Founder F&B',
        url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&auto=format&fit=crop&q=80',
      },
      {
        label: 'Owner Butik / Fashion',
        url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
      },
      {
        label: 'Founder Manufaktur',
        url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80',
      },
      {
        label: 'CEO Startup Lokal',
        url: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&auto=format&fit=crop&q=80',
      },
      {
        label: 'Mitra Agribisnis',
        url: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&auto=format&fit=crop&q=80',
      },
      {
        label: 'Pengusaha Muda',
        url: 'https://images.unsplash.com/photo-1534751516642-a171edd25216?w=200&auto=format&fit=crop&q=80',
      },
    ],
  },
  // 4. Karakter Ilustrasi & 3D Avatar
  {
    category: 'Avatar Ilustrasi Modern',
    items: [
      {
        label: '3D Pro 1',
        url: 'https://api.dicebear.com/7.x/bottts/svg?seed=NexusAdvisor1&backgroundColor=00236f',
      },
      {
        label: '3D Pro 2',
        url: 'https://api.dicebear.com/7.x/bottts/svg?seed=NexusAdvisor2&backgroundColor=0051d5',
      },
      {
        label: 'Persona Ceria 1',
        url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=FadliNexus&backgroundColor=b6e3f4',
      },
      {
        label: 'Persona Ceria 2',
        url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SarahConsultant&backgroundColor=ffdfbf',
      },
      {
        label: 'Persona Ceria 3',
        url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MadeKopiSenja&backgroundColor=c0aede',
      },
      {
        label: 'Persona Ceria 4',
        url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DindaCreative&backgroundColor=d1d4f9',
      },
    ],
  },
];

// Color palette for stylish initials
const INITIAL_COLORS = [
  { name: 'Navy Nexus', bg: '00236f', color: 'ffffff' },
  { name: 'Electric Blue', bg: '0051d5', color: 'ffffff' },
  { name: 'Deep Emerald', bg: '065f46', color: 'ffffff' },
  { name: 'Royal Purple', bg: '6b21a8', color: 'ffffff' },
  { name: 'Warm Amber', bg: 'b45309', color: 'ffffff' },
  { name: 'Teal Modern', bg: '0f766e', color: 'ffffff' },
  { name: 'Rose Red', bg: 'be123c', color: 'ffffff' },
  { name: 'Slate Dark', bg: '334155', color: 'ffffff' },
];

interface AvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl?: string;
  userDisplayName: string;
  userRole?: string;
  onSaveAvatar: (newAvatarUrl: string) => Promise<void>;
}

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  isOpen,
  onClose,
  currentAvatarUrl,
  userDisplayName,
  userRole,
  onSaveAvatar,
}) => {
  const [selectedAvatar, setSelectedAvatar] = useState<string>(
    currentAvatarUrl ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(userDisplayName)}&background=00236f&color=fff&bold=true`
  );
  const [activeTab, setActiveTab] = useState<'presets' | 'upload' | 'url' | 'initials'>('presets');
  const [customUrl, setCustomUrl] = useState('');
  const [isUrlValid, setIsUrlValid] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle file upload & convert to base64 Data URL
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Format file harus berupa gambar (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Ukuran file foto maksimal 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setSelectedAvatar(result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Test custom URL
  const handleApplyCustomUrl = () => {
    setErrorMsg(null);
    if (!customUrl.trim()) return;
    try {
      new URL(customUrl);
      setSelectedAvatar(customUrl.trim());
      setIsUrlValid(true);
    } catch {
      setErrorMsg('Format URL tidak valid. Masukkan URL lengkap (contoh: https://...)');
      setIsUrlValid(false);
    }
  };

  // Generate initial avatar
  const handleSelectInitialColor = (bg: string, color: string) => {
    const generated = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      userDisplayName
    )}&background=${bg}&color=${color}&bold=true&size=200`;
    setSelectedAvatar(generated);
  };

  // Save changes
  const handleConfirmSave = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    try {
      await onSaveAvatar(selectedAvatar);
      onClose();
    } catch (err) {
      console.error('Error saving avatar:', err);
      setErrorMsg('Gagal menyimpan foto avatar. Silakan coba kembali.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in zoom-in-95 max-h-[90vh] flex flex-col font-['Inter']">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00236f] to-[#0051d5] text-white flex items-center justify-center shadow-md shadow-blue-900/20">
              <Camera className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-['Plus_Jakarta_Sans'] tracking-tight">
                Ganti Foto Avatar Profil
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Perbarui avatar profil untuk <strong>{userDisplayName}</strong>{' '}
                {userRole && <span className="uppercase text-xs text-blue-600 font-bold">({userRole})</span>}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Preview Bar */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 my-4 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <img
                src={selectedAvatar}
                alt="Avatar Preview"
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-[#0051d5] shadow-sm bg-white"
                onError={(e) => {
                  // Fallback if image load fails
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    userDisplayName
                  )}&background=00236f&color=fff&bold=true`;
                }}
              />
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                <Check className="w-3 h-3 stroke-[3]" />
              </span>
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Pratinjau Avatar Terpilih
              </span>
              <span className="text-sm font-bold text-slate-900 block font-['Plus_Jakarta_Sans']">
                {userDisplayName}
              </span>
              <span className="text-xs text-slate-500 block truncate max-w-xs">
                {selectedAvatar.startsWith('data:') ? 'Foto Lokal Diunggah' : selectedAvatar}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const defaultInitial = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                userDisplayName
              )}&background=00236f&color=fff&bold=true`;
              setSelectedAvatar(defaultInitial);
            }}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-white px-3 py-1.5 rounded-xl border border-slate-200 transition cursor-pointer shrink-0 inline-flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Reset ke Inisial
          </button>
        </div>

        {errorMsg && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <X className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 mb-4 shrink-0 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`flex-1 py-2 font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'presets'
                ? 'bg-white text-[#00236f] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Galeri Preset</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'upload'
                ? 'bg-white text-[#00236f] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-blue-600" />
            <span>Unggah Foto</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('initials')}
            className={`flex-1 py-2 font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'initials'
                ? 'bg-white text-[#00236f] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5 text-blue-600" />
            <span>Inisial Warna</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`flex-1 py-2 font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'url'
                ? 'bg-white text-[#00236f] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5 text-blue-600" />
            <span>Tautan URL</span>
          </button>
        </div>

        {/* Tab Contents: Scrollable */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-4">
          {/* TAB 1: PRESET GALLERY */}
          {activeTab === 'presets' && (
            <div className="space-y-4">
              {AVATAR_PRESETS.map((group) => (
                <div key={group.category} className="space-y-2">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0051d5]" />
                    <span>{group.category}</span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                    {group.items.map((item) => {
                      const isChosen = selectedAvatar === item.url;
                      return (
                        <button
                          key={item.url}
                          type="button"
                          onClick={() => setSelectedAvatar(item.url)}
                          className={`group relative rounded-2xl overflow-hidden border-2 transition p-1 cursor-pointer flex flex-col items-center justify-center ${
                            isChosen
                              ? 'border-[#0051d5] bg-blue-50/50 shadow-md ring-2 ring-blue-500/30'
                              : 'border-slate-200 hover:border-slate-400 bg-white'
                          }`}
                        >
                          <img
                            src={item.url}
                            alt={item.label}
                            className="w-14 h-14 rounded-xl object-cover transition group-hover:scale-105"
                          />
                          <span className="text-xs text-slate-600 mt-1 font-medium truncate w-full text-center block">
                            {item.label}
                          </span>
                          {isChosen && (
                            <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#0051d5] text-white flex items-center justify-center shadow-xs">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: UPLOAD FILE */}
          {activeTab === 'upload' && (
            <div className="space-y-4 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-[#0051d5] hover:bg-blue-50/20 rounded-3xl p-8 transition cursor-pointer flex flex-col items-center justify-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#00236f] flex items-center justify-center mb-3">
                  <Upload className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">
                  Klik untuk Memilih Foto dari Perangkat
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Mendukung file JPG, PNG, atau WebP (Maksimal 5 MB)
                </p>
                <button
                  type="button"
                  className="mt-4 px-4 py-2 bg-[#00236f] hover:bg-[#1e3a8a] text-white text-xs font-bold rounded-xl transition shadow-xs"
                >
                  Pilih File Foto
                </button>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs text-slate-600 space-y-1">
                <span className="font-semibold block text-slate-800">Tips Foto Profesional:</span>
                <p>• Gunakan foto berorientasi portrait dengan pencahayaan yang cukup.</p>
                <p>• Foto akan otomatis dikonversi dan disimpan ke profil Anda secara aman.</p>
              </div>
            </div>
          )}

          {/* TAB 3: STYLISH INITIALS */}
          {activeTab === 'initials' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                Pilih palet warna resmi untuk avatar inisial nama Anda:{' '}
                <strong>{userDisplayName}</strong>
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {INITIAL_COLORS.map((c) => {
                  const initialUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    userDisplayName
                  )}&background=${c.bg}&color=${c.color}&bold=true&size=200`;
                  const isSelected = selectedAvatar === initialUrl;

                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => handleSelectInitialColor(c.bg, c.color)}
                      className={`p-3 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center gap-2 ${
                        isSelected
                          ? 'border-[#0051d5] bg-blue-50/50 shadow-sm ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <img
                        src={initialUrl}
                        alt={c.name}
                        className="w-12 h-12 rounded-xl object-cover shadow-2xs"
                      />
                      <span className="text-xs font-semibold text-slate-800">{c.name}</span>
                      {isSelected && (
                        <span className="text-xs text-blue-700 font-bold inline-flex items-center gap-1">
                          <Check className="w-3 h-3" /> Dipilih
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: CUSTOM URL */}
          {activeTab === 'url' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Masukkan Tautan Langsung Foto (Image URL):
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="url"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      placeholder="https://contoh-domain.com/foto-anda.jpg"
                      className="w-full pl-10 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0051d5]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyCustomUrl}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer shrink-0"
                  >
                    Terapkan
                  </button>
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-blue-900 space-y-1">
                <span className="font-semibold block">Tautan Gambar yang Didukung:</span>
                <p>• Tautan foto langsung dari Unsplash, LinkedIn, Imgur, atau Cloud Storage.</p>
                <p>• Pastikan tautan berakhiran file gambar (.jpg, .jpeg, .png, .webp) atau tautan publik.</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 mt-4 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirmSave}
            disabled={isSaving}
            className="px-5 py-2.5 bg-[#00236f] hover:bg-[#1e3a8a] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Simpan Foto Avatar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
