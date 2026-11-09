import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Shield,
  UserPlus,
  Briefcase,
  Mail,
  Phone,
  CheckCircle2,
  AlertCircle,
  Building2,
  Clock,
  Sparkles,
  Layers,
  Edit3,
  Plus,
  Trash2,
  Save,
  X,
  Check,
  AlertTriangle,
  RefreshCw,
  Lock,
  Key,
  ChevronRight,
  UserCheck,
  Camera,
  KeyRound,
} from 'lucide-react';
import { AvatarPickerModal } from '../components/AvatarPickerModal';
import { UserProfile, Client, UserRole, Program, ProgramMilestoneTemplate } from '../types';
import {
  getAllUsers,
  getClients,
  saveUserProfile,
  updateUserProfile,
  deleteUserProfile,
  logActivity,
  getPrograms,
  saveProgram,
  deleteProgram,
} from '../services/db';
import { formatRupiah } from '../utils/formatters';
import { DEMO_MODE } from '../config/appMode';

const ROLE_PERMISSIONS_INFO: Record<
  string,
  {
    label: string;
    description: string;
    badgeStyle: string;
    permissions: string[];
    restrictions?: string[];
  }
> = {
  owner: {
    label: 'Owner / Managing Partner',
    description: 'Akses eksekutif penuh tanpa batasan ke seluruh data klien, keuangan, pengaturan tim, dan audit keamanan.',
    badgeStyle: 'bg-purple-100 text-purple-800 border-purple-200',
    permissions: [
      'Akses Penuh Seluruh Klien & Portofolio',
      'Kelola Pengguna, Peran & Hak Akses Tim',
      'Akses Log Audit Keamanan & Finansial',
      'Hapus Klien, Sesi & Master Data',
      'Akses Catatan Sesi Publik & Internal Rahasia',
      'Konfigurasi Template & Paket Program',
    ],
  },
  konsultan: {
    label: 'Konsultan Bisnis / Advisor WFA',
    description: 'Mendampingi klien binaan yang ditugaskan, mencatat sesi, menyusun roadmap, evaluasi diagnosa, dan memantau tugas.',
    badgeStyle: 'bg-blue-100 text-blue-800 border-blue-200',
    permissions: [
      'Akses Data Klien Binaan yang Ditugaskan',
      'Pencatatan Sesi WFA & Notulensi Internal Rahasia',
      'Penyusunan Roadmap & Evaluasi Diagnostik 360°',
      'Pemberian Tugas & Action Items Klien',
    ],
    restrictions: [
      'Dibatasi dari klien lain di luar daftar penugasan',
      'Tidak dapat mengubah konfigurasi tim & hak akses global',
    ],
  },
  consultant: {
    label: 'Konsultan Bisnis / Advisor WFA',
    description: 'Mendampingi klien binaan yang ditugaskan, mencatat sesi, menyusun roadmap, evaluasi diagnosa, dan memantau tugas.',
    badgeStyle: 'bg-blue-100 text-blue-800 border-blue-200',
    permissions: [
      'Akses Data Klien Binaan yang Ditugaskan',
      'Pencatatan Sesi WFA & Notulensi Internal Rahasia',
      'Penyusunan Roadmap & Evaluasi Diagnostik 360°',
      'Pemberian Tugas & Action Items Klien',
    ],
    restrictions: [
      'Dibatasi dari klien lain di luar daftar penugasan',
      'Tidak dapat mengubah konfigurasi tim & hak akses global',
    ],
  },
  tim_grup: {
    label: 'Fasilitator Grup & Cohort',
    description: 'Memfasilitasi sesi mastermind grup, merekam absensi peserta, dan mempublikasikan materi cohort.',
    badgeStyle: 'bg-amber-100 text-amber-800 border-amber-200',
    permissions: [
      'Kelola Grup Mastermind & Cohort Bisnis',
      'Rekap Absensi Sesi Grup & Deteksi Pasif',
      'Kirim Pengumuman & Materi Sesi Grup',
    ],
    restrictions: [
      'Dilarang mengakses catatan internal sesi privat individual',
      'Dilarang melihat data finansial & dokumen rahasia klien',
    ],
  },
  tim_konten: {
    label: 'Tim Konten & Pemasaran',
    description: 'Merencanakan kalender konten, materi perpustakaan bisnis, dan memantau izin studi kasus klien.',
    badgeStyle: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    permissions: [
      'Kelola Kalender Konten & Jadwal Publikasi',
      'Akses Perpustakaan Materi & Template Edukasi',
      'Kelola Izin & Anonimisasi Studi Kasus Klien',
    ],
    restrictions: [
      'Isolasi penuh dari data klien aktif dan sesi privat',
      'Dilarang membaca catatan diagnosis & finansial klien',
    ],
  },
  staf_operasional: {
    label: 'Staf Operasional',
    description: 'Membantu administrasi dokumen, template operasional, dan logistik sesi pendampingan.',
    badgeStyle: 'bg-slate-100 text-slate-800 border-slate-200',
    permissions: [
      'Akses Template Dokumen & Bahan Operasional',
      'Bantuan Koordinasi Jadwal Sesi',
    ],
    restrictions: [
      'Dilarang mengakses data keuangan & laporan sensitif',
    ],
  },
  klien: {
    label: 'Perwakilan Klien UKM',
    description: 'Mengakses Portal Klien untuk melihat progres bisnis, tugas, roadmap, dan catatan sesi bersama.',
    badgeStyle: 'bg-teal-100 text-teal-800 border-teal-200',
    permissions: [
      'Akses Portal Bisnis Klien Pribadi',
      'Lihat Jadwal & Catatan Sesi yang Dibagikan',
      'Perbarui Status Tugas & Unggah Bukti Pelaksanaan',
      'Akses Roadmap & Deliverable Google Drive',
      'Kirim Ulasan & Penilaian Kepuasan Sesi (CSAT)',
    ],
    restrictions: [
      'Hanya dapat melihat data bisnisnya sendiri',
      'Dilarang mengakses catatan internal tim konsultan',
    ],
  },
  client: {
    label: 'Perwakilan Klien UKM',
    description: 'Mengakses Portal Klien untuk melihat progres bisnis, tugas, roadmap, dan catatan sesi bersama.',
    badgeStyle: 'bg-teal-100 text-teal-800 border-teal-200',
    permissions: [
      'Akses Portal Bisnis Klien Pribadi',
      'Lihat Jadwal & Catatan Sesi yang Dibagikan',
      'Perbarui Status Tugas & Unggah Bukti Pelaksanaan',
      'Akses Roadmap & Deliverable Google Drive',
      'Kirim Ulasan & Penilaian Kepuasan Sesi (CSAT)',
    ],
    restrictions: [
      'Hanya dapat melihat data bisnisnya sendiri',
      'Dilarang mengakses catatan internal tim konsultan',
    ],
  },
};

export const TeamSettings: React.FC = () => {
  const { userProfile, updateAvatar, createPasswordLink } = useAuth();
  const [accountLink, setAccountLink] = useState<{ name: string; url: string; days: number } | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Owner membuat tautan aktivasi akun / atur ulang kata sandi, lalu membagikannya (mis. via WhatsApp).
  const handleCreateAccountLink = async (u: UserProfile) => {
    setLinkError(null);
    setAccountLink(null);
    try {
      const res = await createPasswordLink(u.id);
      setAccountLink({ name: u.displayName, url: res.url, days: res.expiresInDays });
      try {
        await navigator.clipboard.writeText(res.url);
      } catch {
        /* clipboard tidak tersedia */
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setLinkError(err?.message || 'Gagal membuat tautan akun.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  const [activeTab, setActiveTab] = useState<'users' | 'programs'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [avatarModalTargetUser, setAvatarModalTargetUser] = useState<UserProfile | null>(null);

  // Invite form
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('konsultan');
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit User State
  const [editingUserModal, setEditingUserModal] = useState<UserProfile | null>(null);
  const [editUserForm, setEditUserForm] = useState<{
    displayName: string;
    email: string;
    role: UserRole;
    title: string;
    phone: string;
    clientId: string;
    avatarUrl: string;
  }>({
    displayName: '',
    email: '',
    role: 'konsultan',
    title: '',
    phone: '',
    clientId: '',
    avatarUrl: '',
  });
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [userSaveSuccess, setUserSaveSuccess] = useState<string | null>(null);
  const [userSaveError, setUserSaveError] = useState<string | null>(null);

  // Delete User State
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [deleteUserError, setDeleteUserError] = useState<string | null>(null);

  // Program Editor State
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [editingProgramForm, setEditingProgramForm] = useState<Program | null>(null);
  const [programSuccessMessage, setProgramSuccessMessage] = useState<string | null>(null);
  const [isSavingProgram, setIsSavingProgram] = useState(false);

  // Program Delete State
  const [programToDelete, setProgramToDelete] = useState<Program | null>(null);
  const [isDeletingProgram, setIsDeletingProgram] = useState(false);
  const [deleteProgramError, setDeleteProgramError] = useState<string | null>(null);

  // Toast & Search
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [uList, cList, pList] = await Promise.all([
          getAllUsers(),
          getClients(),
          getPrograms(),
        ]);
        setUsers(uList);
        setClients(cList);
        setPrograms(pList);
        if (pList.length > 0) {
          setSelectedProgram(pList[0]);
          setEditingProgramForm(JSON.parse(JSON.stringify(pList[0])));
        }
      } catch (err) {
        console.error('Error loading team data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !displayName) return;

    setIsSubmitting(true);
    setSuccessMessage(null);
    try {
      const newUserId = `user-${Date.now()}`;
      const newUser: UserProfile = {
        id: newUserId,
        email: email.trim(),
        displayName: displayName.trim(),
        role,
        title:
          title.trim() ||
          (role === 'konsultan' || role === 'consultant'
            ? 'Konsultan Bisnis'
            : role === 'klien' || role === 'client'
            ? 'Klien'
            : role === 'tim_grup'
            ? 'Tim Pendamping Grup'
            : role === 'tim_konten'
            ? 'Tim Konten & Marketing'
            : 'Staf Operasional'),
        phone: phone.trim(),
        clientId: role === 'klien' || role === 'client' ? selectedClientId : undefined,
        createdAt: new Date().toISOString(),
      };

      await saveUserProfile(newUser);
      await logActivity({
        action: 'Undang Pengguna Baru',
        actorName: userProfile?.displayName || 'Owner',
        actorRole: 'Owner',
        details: `Menambahkan ${newUser.displayName} sebagai peran "${newUser.role}".`,
      });

      setUsers([...users, newUser]);
      setSuccessMessage(
        `Akses untuk ${displayName} (${email}) berhasil ditambahkan. Klik "Tautan Akun" pada daftar pengguna untuk membuat tautan aktivasi, lalu kirimkan ke ${displayName}.`
      );
      setDisplayName('');
      setEmail('');
      setTitle('');
      setPhone('');
      setSelectedClientId('');
    } catch (err) {
      console.error('Error inviting user:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectProgramToEdit = (prog: Program) => {
    setSelectedProgram(prog);
    setEditingProgramForm(JSON.parse(JSON.stringify(prog)));
    setProgramSuccessMessage(null);
  };

  const handleAddMilestoneTemplate = () => {
    if (!editingProgramForm) return;
    const currentMilestones = editingProgramForm.milestoneTemplates || [];
    const newMilestone: ProgramMilestoneTemplate = {
      phase: `Fase ${currentMilestones.length + 1}: Tahapan Baru`,
      title: 'Judul Milestone / Capaian Baru',
      description: 'Deskripsi target capaian dan panduan eksekusi untuk klien.',
      targetWeek: `Minggu ${currentMilestones.length * 2 + 1}-${currentMilestones.length * 2 + 2}`,
      order: currentMilestones.length + 1,
    };

    setEditingProgramForm({
      ...editingProgramForm,
      milestoneTemplates: [...currentMilestones, newMilestone],
    });
  };

  const handleUpdateMilestone = (
    index: number,
    field: keyof ProgramMilestoneTemplate,
    value: any
  ) => {
    if (!editingProgramForm) return;
    const updated = [...(editingProgramForm.milestoneTemplates || [])];
    updated[index] = { ...updated[index], [field]: value };
    setEditingProgramForm({
      ...editingProgramForm,
      milestoneTemplates: updated,
    });
  };

  const handleRemoveMilestone = (index: number) => {
    if (!editingProgramForm) return;
    const updated = (editingProgramForm.milestoneTemplates || []).filter((_, i) => i !== index);
    setEditingProgramForm({
      ...editingProgramForm,
      milestoneTemplates: updated,
    });
  };

  const handleSaveProgramChanges = async () => {
    if (!editingProgramForm) return;
    setIsSavingProgram(true);
    setProgramSuccessMessage(null);
    try {
      await saveProgram(editingProgramForm);
      await logActivity({
        action: 'Update Template Program',
        actorName: userProfile?.displayName || 'Owner',
        actorRole: 'Owner',
        details: `Memperbarui konfigurasi & tahapan template program "${editingProgramForm.name}".`,
      });

      setPrograms(
        programs.map((p) => (p.id === editingProgramForm.id ? editingProgramForm : p))
      );
      setSelectedProgram(editingProgramForm);
      setProgramSuccessMessage(
        `Perubahan program & template tahapan "${editingProgramForm.name}" berhasil disimpan ke Firestore!`
      );
    } catch (err: any) {
      console.error('Error saving program template:', err);
    } finally {
      setIsSavingProgram(false);
    }
  };

  // User Edit Handlers
  const handleOpenEditUser = (user: UserProfile) => {
    setEditingUserModal(user);
    setEditUserForm({
      displayName: user.displayName || '',
      email: user.email || '',
      role: user.role || 'konsultan',
      title: user.title || '',
      phone: user.phone || '',
      clientId: user.clientId || '',
      avatarUrl: user.avatarUrl || '',
    });
    setUserSaveSuccess(null);
    setUserSaveError(null);
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserModal) return;
    if (!editUserForm.displayName.trim() || !editUserForm.email.trim()) {
      setUserSaveError('Nama lengkap dan alamat email tidak boleh kosong.');
      return;
    }

    setIsSavingUser(true);
    setUserSaveSuccess(null);
    setUserSaveError(null);

    try {
      const updates: Partial<UserProfile> = {
        displayName: editUserForm.displayName.trim(),
        email: editUserForm.email.trim(),
        role: editUserForm.role,
        title: editUserForm.title.trim(),
        phone: editUserForm.phone.trim(),
        avatarUrl: editUserForm.avatarUrl.trim() || editingUserModal.avatarUrl,
        clientId:
          editUserForm.role === 'klien' || editUserForm.role === 'client'
            ? editUserForm.clientId
            : undefined,
      };

      await updateUserProfile(
        editingUserModal.id,
        updates,
        userProfile?.displayName || 'Owner',
        'Owner'
      );

      setUsers(
        users.map((u) => (u.id === editingUserModal.id ? { ...u, ...updates } : u))
      );
      setUserSaveSuccess(`Perubahan data & hak akses "${editUserForm.displayName}" berhasil disimpan.`);
      setTimeout(() => {
        setEditingUserModal(null);
        setUserSaveSuccess(null);
      }, 700);
    } catch (err: any) {
      console.error('Error updating user profile:', err);
      setUserSaveError('Gagal memperbarui profil pengguna. Silakan coba kembali.');
    } finally {
      setIsSavingUser(false);
    }
  };

  // User Delete Handlers
  const handlePromptDeleteUser = (user: UserProfile) => {
    setUserToDelete(user);
    setDeleteUserError(null);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    if (userToDelete.id === userProfile?.id || userToDelete.id === 'owner-1') {
      setDeleteUserError('Akun Owner utama atau akun yang sedang aktif saat ini dilindungi dari penghapusan.');
      return;
    }

    setIsDeletingUser(true);
    setDeleteUserError(null);
    try {
      await deleteUserProfile(
        userToDelete.id,
        userProfile?.displayName || 'Owner',
        'Owner'
      );
      setUsers(users.filter((u) => u.id !== userToDelete.id));
      showToast(`Akses untuk "${userToDelete.displayName}" berhasil dihapus.`);
      setUserToDelete(null);
    } catch (err) {
      console.error('Error deleting user:', err);
      setDeleteUserError('Gagal menghapus pengguna. Silakan coba kembali.');
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Program Delete Handlers
  const handlePromptDeleteProgram = (prog: Program) => {
    setProgramToDelete(prog);
    setDeleteProgramError(null);
  };

  const handleConfirmDeleteProgram = async () => {
    if (!programToDelete) return;
    setIsDeletingProgram(true);
    setDeleteProgramError(null);
    try {
      await deleteProgram(
        programToDelete.id,
        userProfile?.displayName || 'Owner',
        'Owner'
      );
      const remainingPrograms = programs.filter((p) => p.id !== programToDelete.id);
      setPrograms(remainingPrograms);
      if (selectedProgram?.id === programToDelete.id) {
        if (remainingPrograms.length > 0) {
          setSelectedProgram(remainingPrograms[0]);
          setEditingProgramForm(JSON.parse(JSON.stringify(remainingPrograms[0])));
        } else {
          setSelectedProgram(null);
          setEditingProgramForm(null);
        }
      }
      showToast(`Program "${programToDelete.name}" berhasil dihapus.`);
      setProgramToDelete(null);
    } catch (err) {
      console.error('Error deleting program:', err);
      setDeleteProgramError('Gagal menghapus program.');
    } finally {
      setIsDeletingProgram(false);
    }
  };

  const consultants = users.filter(
    (u) => u.role === 'konsultan' || u.role === 'consultant'
  );
  const clientsUsers = users.filter((u) => u.role === 'klien' || u.role === 'client');
  const otherStaff = users.filter(
    (u) =>
      u.role === 'tim_grup' ||
      u.role === 'tim_konten' ||
      u.role === 'staf_operasional' ||
      u.role === 'owner'
  );

  return (
    <div className="space-y-8 animate-in fade-in">
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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-['Plus_Jakarta_Sans'] tracking-tight">
            Pengaturan Tim & Program Layanan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola peran tim internal, undangan akun klien, serta konfigurasi template tahapan program pendampingan.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'users'
                ? 'bg-white text-[#00236f] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Hak Akses Tim & Klien</span>
          </button>
          <button
            onClick={() => setActiveTab('programs')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'programs'
                ? 'bg-white text-[#00236f] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Kelola Template Program</span>
          </button>
        </div>
      </div>

      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Form Tambah Pengguna Baru (5 cols) */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <UserPlus className="w-5 h-5 text-[#00236f]" />
              <h2 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                Tambah / Beri Akses Pengguna
              </h2>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Karena tidak ada pendaftaran mandiri publik, seluruh akun konsultan dan perwakilan klien dibuat secara langsung oleh Owner.
            </p>

            {accountLink && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                <div className="font-bold">Tautan akun untuk {accountLink.name} (sudah disalin)</div>
                <input
                  readOnly
                  value={accountLink.url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="w-full px-2.5 py-1.5 border border-amber-300 rounded-lg bg-white text-[11px]"
                />
                <div>
                  Kirim tautan ini ke {accountLink.name} (misalnya via WhatsApp). Berlaku {accountLink.days} hari dan
                  hanya bisa dipakai sekali untuk membuat / mengganti kata sandi.
                </div>
              </div>
            )}
            {linkError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">{linkError}</div>
            )}

            {successMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleInviteUser} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Contoh: Rian Pratama, S.E."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-[#0051d5]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alamat Email Resmi *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rian@nexustgrowth.id atau klien@bisnis.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-[#0051d5]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Peran Akun (Role) *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                  >
                    <option value="owner">Owner</option>
                    <option value="konsultan">Konsultan</option>
                    <option value="klien">Klien</option>
                    <option value="tim_grup">Tim Grup</option>
                    <option value="tim_konten">Tim Konten</option>
                    <option value="staf_operasional">Staf Operasional</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nomor WhatsApp</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+62 8..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jabatan / Spesialisasi</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Operasional & SOP Specialist"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              {(role === 'klien' || role === 'client') && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Hubungkan dengan Bisnis Klien *
                  </label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                    required
                  >
                    <option value="">Pilih data bisnis klien...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.namaBisnis} ({c.namaPemilik})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-[#00236f] hover:bg-[#1e3a8a] text-white font-semibold rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan & Berikan Akses'}
              </button>
            </form>
          </div>

          {/* Daftar Anggota Tim & Pengguna (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Tim Konsultan */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-base text-slate-900 font-['Plus_Jakarta_Sans'] flex items-center justify-between">
                <span>Konsultan Internal Nexust ({consultants.length})</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-[#00236f]">
                  WFA Advisors
                </span>
              </h3>

              <div className="divide-y divide-slate-100">
                {consultants.map((u) => {
                  const assignedCount = clients.filter(
                    (c) =>
                      c.primaryConsultantId === u.id ||
                      (c.consultantIds && c.consultantIds.includes(u.id))
                  ).length;
                  const isCurrent = u.id === userProfile?.id;
                  const isRoot = u.id === 'owner-1';
                  return (
                    <div
                      key={u.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/80 px-2 rounded-xl transition"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="relative group cursor-pointer shrink-0"
                          onClick={() => setAvatarModalTargetUser(u)}
                          title="Klik untuk ganti foto avatar"
                        >
                          <img
                            src={
                              u.avatarUrl ||
                              'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
                            }
                            alt={u.displayName}
                            className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200 group-hover:ring-[#0051d5] transition"
                          />
                          <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white">
                            <Camera className="w-3.5 h-3.5" />
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#0051d5] text-white rounded-full flex items-center justify-center shadow-xs text-[8px] font-bold ring-1 ring-white">
                            ✎
                          </span>
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                            <span>{u.displayName}</span>
                            <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-blue-50 text-[#00236f] border border-blue-200">
                              Konsultan
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500">{u.title || u.email}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>{u.email}</span>
                            {u.phone && <span>• {u.phone}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center shrink-0">
                        <div className="text-right">
                          <span className="font-semibold text-slate-800 block">
                            {assignedCount} Klien Binaan
                          </span>
                          <span className="text-[10px] text-emerald-600 font-medium">Aktif Mendampingi</span>
                        </div>

                        <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                          {!DEMO_MODE && userProfile?.role === 'owner' && (
                            <button
                              type="button"
                              onClick={() => handleCreateAccountLink(u)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-amber-300 hover:bg-amber-50 text-slate-700 hover:text-amber-700 text-xs font-semibold transition cursor-pointer"
                              title="Buat tautan aktivasi akun / atur ulang kata sandi"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                              <span>Tautan Akun</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenEditUser(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 hover:text-[#0051d5] text-xs font-semibold transition cursor-pointer"
                            title="Edit Profil & Hak Akses"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePromptDeleteUser(u)}
                            disabled={isCurrent || isRoot}
                            className={`p-1.5 rounded-lg transition ${
                              isCurrent || isRoot
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                            }`}
                            title={isCurrent || isRoot ? 'Akun aktif terlindungi' : 'Hapus Akses Pengguna'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Akun Klien Terdaftar */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-base text-slate-900 font-['Plus_Jakarta_Sans']">
                Akun Akses Portal Klien ({clientsUsers.length})
              </h3>

              <div className="divide-y divide-slate-100">
                {clientsUsers.map((u) => {
                  const clientObj = clients.find((c) => c.id === u.clientId);
                  const isCurrent = u.id === userProfile?.id;
                  return (
                    <div
                      key={u.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/80 px-2 rounded-xl transition"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="relative group cursor-pointer shrink-0"
                          onClick={() => setAvatarModalTargetUser(u)}
                          title="Klik untuk ganti foto avatar"
                        >
                          <img
                            src={
                              u.avatarUrl ||
                              'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
                            }
                            alt={u.displayName}
                            className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200 group-hover:ring-[#0051d5] transition"
                          />
                          <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white">
                            <Camera className="w-3.5 h-3.5" />
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#0051d5] text-white rounded-full flex items-center justify-center shadow-xs text-[8px] font-bold ring-1 ring-white">
                            ✎
                          </span>
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                            <span>{u.displayName}</span>
                            <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                              Klien Portal
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500">{u.email}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Bisnis: <strong className="text-slate-700">{clientObj?.namaBisnis || 'Klien'}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center shrink-0">
                        <div className="text-right">
                          <span className="font-semibold text-[#0051d5] block">
                            {clientObj?.namaBisnis || 'Klien'}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            Status: {clientObj?.status || 'Aktif'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                          {!DEMO_MODE && userProfile?.role === 'owner' && (
                            <button
                              type="button"
                              onClick={() => handleCreateAccountLink(u)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-amber-300 hover:bg-amber-50 text-slate-700 hover:text-amber-700 text-xs font-semibold transition cursor-pointer"
                              title="Buat tautan aktivasi akun / atur ulang kata sandi"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                              <span>Tautan Akun</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenEditUser(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 hover:text-[#0051d5] text-xs font-semibold transition cursor-pointer"
                            title="Edit Profil & Hak Akses"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePromptDeleteUser(u)}
                            disabled={isCurrent}
                            className={`p-1.5 rounded-lg transition ${
                              isCurrent
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                            }`}
                            title={isCurrent ? 'Akun aktif terlindungi' : 'Hapus Akses Pengguna'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tim & Staf Operasional Lainnya */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-base text-slate-900 font-['Plus_Jakarta_Sans']">
                Owner &amp; Staf Pendukung ({otherStaff.length})
              </h3>

              <div className="divide-y divide-slate-100">
                {otherStaff.map((u) => {
                  const isCurrent = u.id === userProfile?.id;
                  const isRoot = u.id === 'owner-1';
                  const roleBadge = ROLE_PERMISSIONS_INFO[u.role]?.badgeStyle || 'bg-slate-100 text-slate-800';
                  return (
                    <div
                      key={u.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/80 px-2 rounded-xl transition"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="relative group cursor-pointer shrink-0"
                          onClick={() => setAvatarModalTargetUser(u)}
                          title="Klik untuk ganti foto avatar"
                        >
                          <img
                            src={
                              u.avatarUrl ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                            }
                            alt={u.displayName}
                            className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200 group-hover:ring-[#0051d5] transition"
                          />
                          <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white">
                            <Camera className="w-3.5 h-3.5" />
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#0051d5] text-white rounded-full flex items-center justify-center shadow-xs text-[8px] font-bold ring-1 ring-white">
                            ✎
                          </span>
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                            <span>{u.displayName}</span>
                            <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold uppercase border ${roleBadge}`}>
                              {u.role}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500">{u.title || u.email}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>{u.email}</span>
                            {u.phone && <span>• {u.phone}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {!DEMO_MODE && userProfile?.role === 'owner' && (
                          <button
                            type="button"
                            onClick={() => handleCreateAccountLink(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-amber-300 hover:bg-amber-50 text-slate-700 hover:text-amber-700 text-xs font-semibold transition cursor-pointer"
                            title="Buat tautan aktivasi akun / atur ulang kata sandi"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Tautan Akun</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenEditUser(u)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 hover:text-[#0051d5] text-xs font-semibold transition cursor-pointer"
                          title="Edit Profil & Hak Akses"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePromptDeleteUser(u)}
                          disabled={isCurrent || isRoot}
                          className={`p-1.5 rounded-lg transition ${
                            isCurrent || isRoot
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                          }`}
                          title={isCurrent || isRoot ? 'Akun owner aktif terlindungi' : 'Hapus Akses Pengguna'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KELOLA TEMPLATE PROGRAM & TAHAPAN (Owner Edit) */}
      {activeTab === 'programs' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {programs.map((p) => {
              const isSelected = selectedProgram?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectProgramToEdit(p)}
                  className={`p-5 rounded-2xl border transition cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/70 border-[#00236f] ring-2 ring-[#00236f]/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#0051d5]">
                      {p.type} Program
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      {formatRupiah(p.price)}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans'] mt-1">
                    {p.name}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">{p.description}</p>
                  <div className="flex items-center gap-4 text-[11px] text-slate-600 mt-3 pt-3 border-t border-slate-100">
                    <span>Durasi: <strong>{p.durationWeeks} Minggu</strong></span>
                    <span>Total Sesi: <strong>{p.totalSessions} Sesi</strong></span>
                    <span>Milestones: <strong>{p.milestoneTemplates?.length || 0} Tahapan</strong></span>
                  </div>
                </div>
              );
            })}
          </div>

          {editingProgramForm && (
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-[#0051d5] uppercase tracking-wider">
                    Editor Program & Roadmap Template
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans'] mt-0.5">
                    Konfigurasi: {editingProgramForm.name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Seluruh tahapan template disimpan langsung di koleksi <code>programs</code> Firestore dan digunakan otomatis saat onboarding klien baru.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePromptDeleteProgram(editingProgramForm)}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition cursor-pointer"
                    title="Hapus Program Ini"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>Hapus Program</span>
                  </button>

                  <button
                    onClick={handleSaveProgramChanges}
                    disabled={isSavingProgram}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#00236f] hover:bg-[#1e3a8a] text-white text-xs font-semibold transition shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingProgram ? 'Menyimpan ke Firestore...' : 'Simpan Perubahan Program'}</span>
                  </button>
                </div>
              </div>

              {programSuccessMessage && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{programSuccessMessage}</span>
                </div>
              )}

              {/* Form Parameter Program */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Program</label>
                  <input
                    type="text"
                    value={editingProgramForm.name}
                    onChange={(e) =>
                      setEditingProgramForm({ ...editingProgramForm, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Durasi Standar (Minggu)</label>
                  <input
                    type="number"
                    value={editingProgramForm.durationWeeks}
                    onChange={(e) =>
                      setEditingProgramForm({
                        ...editingProgramForm,
                        durationWeeks: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Total Sesi WFA</label>
                  <input
                    type="number"
                    value={editingProgramForm.totalSessions}
                    onChange={(e) =>
                      setEditingProgramForm({
                        ...editingProgramForm,
                        totalSessions: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block font-semibold text-slate-700 mb-1">Deskripsi Program</label>
                  <textarea
                    rows={2}
                    value={editingProgramForm.description}
                    onChange={(e) =>
                      setEditingProgramForm({ ...editingProgramForm, description: e.target.value })
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Editor Tahapan Template (Milestones) */}
              <div className="pt-4 border-t border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                      Tahapan Template Roadmap ({editingProgramForm.milestoneTemplates?.length || 0})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Tahapan terstruktur yang otomatis diadopsi menjadi roadmap klien saat mendaftar ke program ini.
                    </p>
                  </div>

                  <button
                    onClick={handleAddMilestoneTemplate}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Tahapan Template
                  </button>
                </div>

                <div className="space-y-3">
                  {(editingProgramForm.milestoneTemplates || []).map((m, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="w-6 h-6 rounded-full bg-[#00236f] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            value={m.phase}
                            onChange={(e) => handleUpdateMilestone(idx, 'phase', e.target.value)}
                            placeholder="Fase (Contoh: Fase 1: Diagnostik & Finansial)"
                            className="w-1/2 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                          />
                          <input
                            type="text"
                            value={m.targetWeek}
                            onChange={(e) => handleUpdateMilestone(idx, 'targetWeek', e.target.value)}
                            placeholder="Target (Contoh: Minggu 1-3)"
                            className="w-1/3 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs"
                          />
                        </div>

                        <button
                          onClick={() => handleRemoveMilestone(idx)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition cursor-pointer"
                          title="Hapus tahapan ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div>
                        <input
                          type="text"
                          value={m.title}
                          onChange={(e) => handleUpdateMilestone(idx, 'title', e.target.value)}
                          placeholder="Judul Milestone"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                        />
                      </div>

                      <div>
                        <textarea
                          rows={2}
                          value={m.description}
                          onChange={(e) =>
                            handleUpdateMilestone(idx, 'description', e.target.value)
                          }
                          placeholder="Deskripsi target tahapan..."
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-600"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: EDIT PROFIL & HAK AKSES PENGGUNA */}
      {editingUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#00236f] flex items-center justify-center font-bold border border-blue-100">
                  <Key className="w-5 h-5 text-[#00236f]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                    Edit Pengaturan Pengguna &amp; Hak Akses
                  </h3>
                  <p className="text-xs text-slate-500">
                    ID: <span className="font-mono">{editingUserModal.id}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUserModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {userSaveSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{userSaveSuccess}</span>
              </div>
            )}

            {userSaveError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{userSaveError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    value={editUserForm.displayName}
                    onChange={(e) => setEditUserForm({ ...editUserForm, displayName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0051d5] outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Resmi *</label>
                  <input
                    type="email"
                    value={editUserForm.email}
                    onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0051d5] outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Peran &amp; Hak Akses *</label>
                  <select
                    value={editUserForm.role}
                    onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium"
                  >
                    <option value="konsultan">Konsultan Bisnis (WFA Advisor)</option>
                    <option value="tim_grup">Fasilitator Grup / Cohort</option>
                    <option value="tim_konten">Tim Konten &amp; Pemasaran</option>
                    <option value="staf_operasional">Staf Operasional</option>
                    <option value="klien">Perwakilan Klien (Portal)</option>
                    <option value="owner">Owner / Managing Partner</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nomor WhatsApp / HP</label>
                  <input
                    type="text"
                    value={editUserForm.phone}
                    onChange={(e) => setEditUserForm({ ...editUserForm, phone: e.target.value })}
                    placeholder="+62 8..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jabatan / Spesialisasi</label>
                <input
                  type="text"
                  value={editUserForm.title}
                  onChange={(e) => setEditUserForm({ ...editUserForm, title: e.target.value })}
                  placeholder="Contoh: Financial &amp; Unit Economics Lead"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              {/* Matriks Hak Akses & Privilese Live Preview */}
              {ROLE_PERMISSIONS_INFO[editUserForm.role] && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-[#00236f]" />
                      <span>Matriks Otorisasi: {ROLE_PERMISSIONS_INFO[editUserForm.role].label}</span>
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ROLE_PERMISSIONS_INFO[editUserForm.role].badgeStyle}`}>
                      {editUserForm.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {ROLE_PERMISSIONS_INFO[editUserForm.role].description}
                  </p>
                  <div className="pt-2 border-t border-slate-200/60 space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Izin Yang Diberikan:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-700">
                      {ROLE_PERMISSIONS_INFO[editUserForm.role].permissions.map((perm, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="truncate">{perm}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {(editUserForm.role === 'klien' || editUserForm.role === 'client') && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Hubungkan Bisnis Klien *
                  </label>
                  <select
                    value={editUserForm.clientId}
                    onChange={(e) => setEditUserForm({ ...editUserForm, clientId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="">Pilih data bisnis klien...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.namaBisnis} ({c.namaPemilik})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">Foto Profil / Avatar</label>
                  <button
                    type="button"
                    onClick={() => {
                      if (editingUserModal) {
                        setAvatarModalTargetUser(editingUserModal);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-[#00236f] hover:bg-blue-100 text-xs font-bold transition cursor-pointer border border-blue-200"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#0051d5]" />
                    Pilih dari Galeri &amp; Upload
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={editUserForm.avatarUrl}
                    onChange={(e) => setEditUserForm({ ...editUserForm, avatarUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-xl"
                  />
                  {editUserForm.avatarUrl && (
                    <img
                      src={editUserForm.avatarUrl}
                      alt="Preview"
                      className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                  )}
                </div>
                {/* Avatar Quick Presets */}
                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500">
                  <span>Preset Avatar:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setEditUserForm({
                        ...editUserForm,
                        avatarUrl:
                          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
                      })
                    }
                    className="text-[#0051d5] hover:underline cursor-pointer"
                  >
                    Konsultan Pria
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() =>
                      setEditUserForm({
                        ...editUserForm,
                        avatarUrl:
                          'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
                      })
                    }
                    className="text-[#0051d5] hover:underline cursor-pointer"
                  >
                    Konsultan Wanita
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() =>
                      setEditUserForm({
                        ...editUserForm,
                        avatarUrl:
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                      })
                    }
                    className="text-[#0051d5] hover:underline cursor-pointer"
                  >
                    Executive
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUserModal(null)}
                  disabled={isSavingUser}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingUser}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#00236f] hover:bg-[#1e3a8a] text-white font-bold rounded-xl transition cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {isSavingUser ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: HAPUS AKSES PENGGUNA */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                  Hapus Akun &amp; Hak Akses?
                </h3>
                <p className="text-xs text-slate-500">
                  Anda akan mencabut akses sistem untuk <strong className="text-slate-900">{userToDelete.displayName}</strong> ({userToDelete.email}).
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 text-xs text-rose-800 space-y-1.5">
              <div className="font-bold flex items-center gap-1 text-rose-900">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                Konsekuensi Pencabutan Akses
              </div>
              <p className="leading-relaxed">
                Pengguna tidak lagi dapat masuk ke Nexust Client Hub atau mengakses data klien/dokumen konsultasi terkait. Tindakan ini dicatat ke log audit.
              </p>
            </div>

            {/* Warning if consultant has active clients */}
            {(userToDelete.role === 'konsultan' || userToDelete.role === 'consultant') && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                <span className="font-bold block">Pemberitahuan Klien Binaan:</span>
                <p className="text-[11px] text-amber-800">
                  Pastikan klien yang ditugaskan ke konsultan ini dialihkan ke konsultan pengganti melalui halaman Daftar Klien.
                </p>
              </div>
            )}

            {/* Error Message if deletion fails or blocked */}
            {deleteUserError && (
              <div className="p-3 rounded-xl bg-rose-100 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{deleteUserError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={isDeletingUser}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                disabled={isDeletingUser}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-40 shadow-sm"
              >
                {isDeletingUser ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Hapus Akses</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: HAPUS PAKET PROGRAM */}
      {programToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                  Hapus Template Program?
                </h3>
                <p className="text-xs text-slate-500">
                  Anda akan menghapus template paket <strong className="text-slate-900">{programToDelete.name}</strong> ({formatRupiah(programToDelete.price)}).
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 text-xs text-rose-800 space-y-1">
              <span className="font-bold block text-rose-900">Perhatian:</span>
              <p className="leading-relaxed">
                Template tahapan milestone program ini tidak akan lagi tersedia untuk pendaftaran onboarding klien baru.
              </p>
            </div>

            {deleteProgramError && (
              <div className="p-3 rounded-xl bg-rose-100 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{deleteProgramError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setProgramToDelete(null)}
                disabled={isDeletingProgram}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProgram}
                disabled={isDeletingProgram}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-40 shadow-sm"
              >
                {isDeletingProgram ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Program</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Picker Modal */}
      {avatarModalTargetUser && (
        <AvatarPickerModal
          isOpen={Boolean(avatarModalTargetUser)}
          onClose={() => setAvatarModalTargetUser(null)}
          currentAvatarUrl={avatarModalTargetUser.avatarUrl}
          userDisplayName={avatarModalTargetUser.displayName}
          userRole={avatarModalTargetUser.role}
          onSaveAvatar={async (newAvatarUrl) => {
            await updateUserProfile(
              avatarModalTargetUser.id,
              { avatarUrl: newAvatarUrl },
              userProfile?.displayName || 'Owner',
              userProfile?.role || 'owner'
            );
            if (avatarModalTargetUser.id === userProfile?.id) {
              await updateAvatar(newAvatarUrl);
            }
            setUsers((prev) =>
              prev.map((u) => (u.id === avatarModalTargetUser.id ? { ...u, avatarUrl: newAvatarUrl } : u))
            );
            if (editingUserModal && editingUserModal.id === avatarModalTargetUser.id) {
              setEditUserForm((prev) => ({ ...prev, avatarUrl: newAvatarUrl }));
            }
            setAvatarModalTargetUser(null);
          }}
        />
      )}
    </div>
  );
};

