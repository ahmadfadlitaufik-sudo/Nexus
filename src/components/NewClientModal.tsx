import { todayWITA } from '../utils/formatters';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Building2, User, Phone, MapPin, Briefcase, Plus, AlertCircle, Calendar, CheckSquare, Layers } from 'lucide-react';
import { ClientStatus, Program, UserProfile } from '../types';
import { createClientWithEnrollmentAndConsultants, getPrograms, getAllUsers } from '../services/db';

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientCreated: (clientId: string) => void;
}

export const NewClientModal: React.FC<NewClientModalProps> = ({
  isOpen,
  onClose,
  onClientCreated,
}) => {
  const { userProfile } = useAuth();
  const [namaBisnis, setNamaBisnis] = useState('');
  const [namaPemilik, setNamaPemilik] = useState('');
  const [industri, setIndustri] = useState('Food & Beverage');
  const [kota, setKota] = useState('Denpasar, Bali');
  const [lamaUsaha, setLamaUsaha] = useState('2 Tahun');
  const [jumlahKaryawan, setJumlahKaryawan] = useState('10 Orang');
  const [kontak, setKontak] = useState('+62 8');
  const [status, setStatus] = useState<ClientStatus>('Onboarding');
  const [programId, setProgramId] = useState('prog-fundamental');
  const [selectedConsultantIds, setSelectedConsultantIds] = useState<string[]>([]);

  // Enrollment fields
  const [startDate, setStartDate] = useState(todayWITA());
  const [durationWeeks, setDurationWeeks] = useState(12);
  const [totalSessions, setTotalSessions] = useState(12);

  const [programs, setPrograms] = useState<Program[]>([]);
  const [consultants, setConsultants] = useState<UserProfile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMeta() {
      try {
        const [pList, uList] = await Promise.all([getPrograms(), getAllUsers()]);
        setPrograms(pList);
        // Include consultants and owners who can act as primary/co-consultant
        const consList = uList.filter(
          (u) => u.role === 'consultant' || u.role === 'konsultan' || u.role === 'owner'
        );
        setConsultants(consList);
        if (consList.length > 0 && selectedConsultantIds.length === 0) {
          setSelectedConsultantIds([consList[0].id]);
        }
      } catch (err) {
        console.error('Error loading metadata for new client modal:', err);
      }
    }
    if (isOpen) {
      loadMeta();
    }
  }, [isOpen]);

  // Adjust default duration & sessions when program changes
  const handleProgramChange = (pId: string) => {
    setProgramId(pId);
    const selected = programs.find((p) => p.id === pId);
    if (selected) {
      setDurationWeeks(selected.durationWeeks || 12);
      setTotalSessions(selected.totalSessions || 12);
    }
  };

  const toggleConsultant = (cId: string) => {
    if (selectedConsultantIds.includes(cId)) {
      if (selectedConsultantIds.length === 1) return; // keep at least 1
      setSelectedConsultantIds(selectedConsultantIds.filter((id) => id !== cId));
    } else {
      setSelectedConsultantIds([...selectedConsultantIds, cId]);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!namaBisnis.trim() || !namaPemilik.trim()) {
      setError('Nama bisnis dan nama pemilik wajib diisi.');
      return;
    }

    if (selectedConsultantIds.length === 0) {
      setError('Pilih minimal satu konsultan pendamping.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newId = await createClientWithEnrollmentAndConsultants({
        client: {
          namaBisnis: namaBisnis.trim(),
          namaPemilik: namaPemilik.trim(),
          industri,
          kota: kota.trim(),
          lamaUsaha,
          jumlahKaryawan,
          kontak: kontak.trim(),
          status,
          programId,
          primaryConsultantId: selectedConsultantIds[0],
          consultantIds: selectedConsultantIds,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        consultantIds: selectedConsultantIds,
        enrollment: {
          programId,
          startDate,
          durationWeeks: Number(durationWeeks),
          totalSessions: Number(totalSessions),
        },
      });

      onClientCreated(newId);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Gagal menambahkan klien.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-['Inter']">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 my-8">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#00236f]" />
            <h2 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
              Registrasi Klien & Pendaftaran Program
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="m-6 mb-0 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
          {/* SECTION 1: PROFIL BISNIS */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#0051d5] block mb-2">
              1. Data Profil Bisnis Klien
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Bisnis / Brand *</label>
                <input
                  type="text"
                  value={namaBisnis}
                  onChange={(e) => setNamaBisnis(e.target.value)}
                  placeholder="Contoh: Kopi Senja Nusantara"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-[#0051d5]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Pemilik Usaha *</label>
                <input
                  type="text"
                  value={namaPemilik}
                  onChange={(e) => setNamaPemilik(e.target.value)}
                  placeholder="Contoh: Made Aryawan"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-[#0051d5]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Industri / Sektor</label>
                <input
                  type="text"
                  value={industri}
                  onChange={(e) => setIndustri(e.target.value)}
                  placeholder="Food & Beverage, Fashion, Logistik..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kota & Domisili (WITA)</label>
                <input
                  type="text"
                  value={kota}
                  onChange={(e) => setKota(e.target.value)}
                  placeholder="Denpasar, Balikpapan, Makassar..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Lama Usaha / Karyawan</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={lamaUsaha}
                    onChange={(e) => setLamaUsaha(e.target.value)}
                    placeholder="3 Tahun"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                  <input
                    type="text"
                    value={jumlahKaryawan}
                    onChange={(e) => setJumlahKaryawan(e.target.value)}
                    placeholder="14 Orang"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kontak WhatsApp *</label>
                <input
                  type="text"
                  value={kontak}
                  onChange={(e) => setKontak(e.target.value)}
                  placeholder="+62 812-3456-7890"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status Klien</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                >
                  <option value="Prospek">Prospek</option>
                  <option value="Onboarding">Onboarding</option>
                  <option value="Aktif">Aktif</option>
                  <option value="Selesai">Selesai</option>
                  <option value="Berhenti">Berhenti</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 2: PENUGASAN SATU ATAU LEBIH KONSULTAN */}
          <div className="pt-3 border-t border-slate-200">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0051d5] block mb-2">
              2. Penugasan Konsultan Pendamping (Satu atau Lebih)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {consultants.map((c) => {
                const isSelected = selectedConsultantIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition ${
                      isSelected
                        ? 'bg-blue-50/70 border-[#0051d5]'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleConsultant(c.id)}
                      className="rounded text-[#00236f] focus:ring-[#0051d5]"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{c.displayName}</span>
                        {c.role === 'owner' && (
                          <span className="text-xs px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded font-bold">
                            Owner / Advisor
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">{c.title || (c.role === 'owner' ? 'Founder & Advisor' : 'Konsultan Bisnis')}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: PENDAFTARAN PROGRAM & SESI */}
          <div className="pt-3 border-t border-slate-200">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0051d5] block mb-2">
              3. Pendaftaran Program & Rencana Sesi (Enrollment)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-3">
                <label className="block font-semibold text-slate-700 mb-1">Pilih Program Layanan *</label>
                <select
                  value={programId}
                  onChange={(e) => handleProgramChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                >
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.type}) - Durasi: {p.durationWeeks} Minggu, {p.totalSessions || p.durationWeeks} Sesi
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tanggal Mulai Program</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Durasi (Minggu)</label>
                <input
                  type="number"
                  min="1"
                  value={durationWeeks}
                  onChange={(e) => setDurationWeeks(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Total Sesi Pendampingan</label>
                <input
                  type="number"
                  min="1"
                  value={totalSessions}
                  onChange={(e) => setTotalSessions(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-[#00236f] hover:bg-[#1e3a8a] text-white font-semibold rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Mendaftarkan...' : 'Daftarkan Klien & Program'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
