import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Compass,
  Lock,
  Mail,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Users,
  Briefcase,
  AlertCircle,
  ArrowLeft,
  UserPlus,
  Building2,
  Phone,
  Sparkles,
  Layers,
  Clock,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { SEED_USERS } from '../data/seedData';
import { RegistrationCategory, UserRole, UserProfile } from '../types';
import { DEMO_MODE } from '../config/appMode';

/** Terjemahkan kode error Firebase Auth ke pesan yang mudah dipahami. */
function authErrorMessage(err: any, fallback: string): string {
  const code: string = err?.code || '';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found'))
    return 'Email atau kata sandi salah.';
  if (code.includes('email-already-in-use'))
    return 'Email ini sudah terdaftar. Silakan masuk, atau gunakan "Lupa sandi?".';
  if (code.includes('weak-password')) return 'Kata sandi terlalu lemah (minimal 6 karakter).';
  if (code.includes('invalid-email')) return 'Format email tidak valid.';
  if (code.includes('too-many-requests')) return 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.';
  if (code.includes('popup-closed-by-user')) return 'Jendela login Google ditutup sebelum selesai.';
  if (code.includes('unauthorized-domain'))
    return 'Domain ini belum diizinkan di Firebase Authentication (Authorized domains).';
  if (err?.message && !code) return err.message;
  return fallback;
}

interface LoginPageProps {
  onBackToLanding: () => void;
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onBackToLanding, onLoginSuccess }) => {
  const {
    loginWithGoogle,
    loginWithEmail,
    registerAccount,
    switchDemoRole,
    availableDemoUsers,
    needsEmailVerification,
    resendVerificationEmail,
    resetPassword,
    logout,
    currentUser,
  } = useAuth();
  const [info, setInfo] = useState<string | null>(null);

  // Mode: 'login' | 'register'
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Register form state
  const [regCategory, setRegCategory] = useState<RegistrationCategory>('staff');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // BOD specific
  const [bodTitle, setBodTitle] = useState('Managing Partner / Direksi');

  // Staff specific
  const [staffRole, setStaffRole] = useState<UserRole>('konsultan');
  const [staffTitle, setStaffTitle] = useState('Konsultan Pendamping Bisnis');
  const [staffNotes, setStaffNotes] = useState('');

  // Client specific
  const [clientCompanyName, setClientCompanyName] = useState('');
  const [clientIndustry, setClientIndustry] = useState('Food & Beverage');
  const [clientCity, setClientCity] = useState('');
  const [clientTeamSize, setClientTeamSize] = useState('1-10 Karyawan');
  const [clientProgramInterest, setClientProgramInterest] = useState('Pendampingan Fundamental 12 Minggu');
  const [clientNotes, setClientNotes] = useState('');

  // Registration success banner
  const [registeredUser, setRegisteredUser] = useState<UserProfile | null>(null);

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email) {
      setError('Silakan masukkan alamat email Anda.');
      return;
    }
    setIsSubmitting(true);
    try {
      if (!DEMO_MODE && !password) {
        setError('Silakan masukkan kata sandi Anda.');
        setIsSubmitting(false);
        return;
      }
      await loginWithEmail(email, password);
      onLoginSuccess();
    } catch (err: any) {
      setError(authErrorMessage(err, 'Email atau kata sandi tidak sesuai.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Google Login
  const handleGoogleLogin = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await loginWithGoogle();
      onLoginSuccess();
    } catch (err) {
      setError(authErrorMessage(err, 'Gagal masuk dengan Google. Silakan coba kembali.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setInfo(null);
    if (!email) {
      setError('Isi alamat email terlebih dahulu, lalu klik "Lupa sandi?".');
      return;
    }
    try {
      await resetPassword(email);
      setInfo(`Tautan atur ulang kata sandi telah dikirim ke ${email}. Cek kotak masuk / spam.`);
    } catch (err) {
      setError(authErrorMessage(err, 'Gagal mengirim email atur ulang kata sandi.'));
    }
  };

  // Handle Quick Demo Account Selection
  const handleSelectDemoAccount = async (userId: string) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await switchDemoRole(userId);
      onLoginSuccess();
    } catch (err) {
      setError('Gagal beralih akun simulasi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Registration Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!regName.trim()) {
      setError('Silakan isi nama lengkap pendaftar.');
      return;
    }
    if (!regEmail.trim()) {
      setError('Silakan isi alamat email resmi.');
      return;
    }
    if (!DEMO_MODE && regPassword.length < 6) {
      setError('Kata sandi minimal 6 karakter.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalRole: UserRole = 'konsultan';
      let finalTitle = '';
      let initialStatus: 'pending' | 'active' = 'pending';

      if (regCategory === 'bod') {
        finalRole = 'owner';
        finalTitle = bodTitle || 'Managing Partner / Direksi';
        // Akun BOD selalu menunggu persetujuan Owner (tidak ada kode akses di sisi browser).
        initialStatus = 'pending';
      } else if (regCategory === 'staff') {
        finalRole = staffRole;
        finalTitle = staffTitle;
        initialStatus = 'pending'; // Staf always requires owner approval!
      } else if (regCategory === 'client') {
        finalRole = 'klien';
        finalTitle = `Owner ${clientCompanyName || 'Bisnis'}`;
        initialStatus = 'pending'; // Client onboarding approval
      }

      const newProfile = await registerAccount({
        displayName: regName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim() || undefined,
        role: finalRole,
        title: finalTitle,
        status: initialStatus,
        registrationCategory: regCategory,
        companyName: clientCompanyName.trim() || undefined,
        industry: clientIndustry || undefined,
        city: clientCity.trim() || undefined,
        teamSize: clientTeamSize || undefined,
        programInterest: clientProgramInterest || undefined,
        notes: (regCategory === 'client' ? clientNotes : staffNotes).trim() || undefined,
        rawPassword: regPassword,
      });

      setRegisteredUser(newProfile);
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(authErrorMessage(err, 'Terjadi kesalahan saat menyimpan data pendaftaran. Silakan coba lagi.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Use dynamic demo users pool
  const demoUsersList = DEMO_MODE
    ? availableDemoUsers.length > 0
      ? availableDemoUsers
      : SEED_USERS
    : [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-['Inter']">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="flex items-center justify-between mb-6 px-4 sm:px-0">
          <button
            onClick={onBackToLanding}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Beranda Publik
          </button>

          <span className="text-[11px] font-semibold text-slate-400">
            Sistem WFA Terpadu • WITA Timezone
          </span>
        </div>

        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00236f] to-[#1e3a8a] text-white flex items-center justify-center font-bold text-xl shadow-md shadow-blue-900/20">
            <Compass className="w-7 h-7 text-blue-200" />
          </div>
        </div>

        <h2 className="mt-4 text-center text-2xl sm:text-3xl font-extrabold text-slate-900 font-['Plus_Jakarta_Sans'] tracking-tight">
          Client &amp; Team Hub
        </h2>
        <p className="mt-1.5 text-center text-xs sm:text-sm text-slate-600">
          Nexust Growth Partner • Platform Pendampingan Bisnis UKM WFA
        </p>

        {/* Tab Switcher: Masuk vs Daftar Baru */}
        <div className="mt-6 flex justify-center px-4 sm:px-0">
          <div className="bg-slate-200/80 p-1 rounded-2xl flex max-w-sm w-full">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setError(null);
                setRegisteredUser(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                authMode === 'login'
                  ? 'bg-white text-[#00236f] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Masuk ke Akun
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setError(null);
                setRegisteredUser(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                authMode === 'register'
                  ? 'bg-white text-[#00236f] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 text-[#0051d5]" />
              Daftar Akun Baru
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl px-4">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-sm border border-slate-200 rounded-3xl">
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {info && (
            <div className="mb-6 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{info}</span>
            </div>
          )}

          {needsEmailVerification && !registeredUser && (
            <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
              <div className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  Email <span className="font-bold">{currentUser?.email}</span> belum diverifikasi. Buka
                  tautan verifikasi yang kami kirim ke email Anda, lalu masuk kembali.
                </span>
              </div>
              <div className="flex gap-2 pl-6">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await resendVerificationEmail();
                      setInfo('Email verifikasi telah dikirim ulang.');
                    } catch (err) {
                      setError(authErrorMessage(err, 'Gagal mengirim ulang email verifikasi.'));
                    }
                  }}
                  className="font-bold text-amber-800 hover:underline cursor-pointer"
                >
                  Kirim ulang email
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="font-bold text-amber-800 hover:underline cursor-pointer"
                >
                  Keluar
                </button>
              </div>
            </div>
          )}

          {/* ===================== REGISTRATION SUCCESS STATE ===================== */}
          {registeredUser ? (
            <div className="text-center py-4 space-y-4 animate-in fade-in zoom-in-95">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900 font-['Plus_Jakarta_Sans']">
                Pendaftaran Berhasil Dikirim!
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Terima kasih, <span className="font-bold text-slate-900">{registeredUser.displayName}</span>. 
                {registeredUser.status === 'active' ? (
                  <span> Akun Anda telah langsung aktif! Silakan masuk untuk mulai menggunakan sistem.</span>
                ) : (
                  <span> Akun Anda saat ini berstatus <span className="font-bold text-amber-700">Menunggu Persetujuan (Pending Approval)</span> dari Owner / BOD Nexust Growth Partner (Ahmad Fadli Taufik).</span>
                )}
                {!DEMO_MODE && (
                  <span className="block mt-2">
                    Kami telah mengirim <span className="font-bold">tautan verifikasi</span> ke email Anda. Klik tautan tersebut, lalu masuk kembali dengan email &amp; kata sandi Anda.
                  </span>
                )}
              </p>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-left text-xs space-y-2 max-w-md mx-auto">
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-semibold text-slate-800">{registeredUser.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Peran Diajukan:</span>
                  <span className="font-semibold text-blue-700">{registeredUser.title || registeredUser.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status Akun:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-full text-[10px] uppercase ${
                      registeredUser.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {registeredUser.status === 'active' ? 'Aktif' : 'Menunggu Approval'}
                  </span>
                </div>
              </div>

              <div className="pt-3 flex flex-col gap-2 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={async () => {
                    if (DEMO_MODE) {
                      await loginWithEmail(registeredUser.email, '');
                      onLoginSuccess();
                      return;
                    }
                    try {
                      await resendVerificationEmail();
                      setInfo(`Email verifikasi dikirim ulang ke ${registeredUser.email}.`);
                    } catch (err) {
                      setError(authErrorMessage(err, 'Gagal mengirim ulang email verifikasi.'));
                    }
                  }}
                  className="w-full py-2.5 px-4 bg-[#00236f] hover:bg-[#1e3a8a] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  {DEMO_MODE ? 'Masuk Sekarang & Cek Status' : 'Kirim Ulang Email Verifikasi'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRegisteredUser(null);
                    setAuthMode('login');
                  }}
                  className="w-full py-2 px-4 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Kembali ke Halaman Masuk
                </button>
              </div>
            </div>
          ) : authMode === 'login' ? (
            /* ===================== 1. LOGIN MODE ===================== */
            <div>
              <form className="space-y-4" onSubmit={handleLoginSubmit}>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alamat Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@perusahaan.com"
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0051d5] focus:border-transparent transition"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Kata Sandi
                    </label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-[11px] text-[#0051d5] hover:underline cursor-pointer"
                    >
                      Lupa sandi?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0051d5] focus:border-transparent transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#00236f] hover:bg-[#1e3a8a] text-white py-2.5 px-4 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 mt-2"
                >
                  {isSubmitting ? 'Memproses...' : 'Masuk ke Client Hub'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-3 text-slate-400 font-semibold tracking-wider text-[10px]">
                      Atau masuk dengan
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isSubmitting}
                    className="w-full inline-flex items-center justify-center gap-3 py-2.5 px-4 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.14C3.27 21.37 7.34 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.59H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.41l4.03-3.14z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.27 2.63 1.25 6.59l4.03 3.14c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                    Akun Google Resmi
                  </button>
                </div>
              </div>

              {/* Callout to register */}
              <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-500">
                  Belum memiliki akun?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register');
                      setError(null);
                    }}
                    className="font-bold text-[#0051d5] hover:underline cursor-pointer"
                  >
                    Daftar sebagai BOD, Staf, atau Klien →
                  </button>
                </p>
              </div>
            </div>
          ) : (
            /* ===================== 2. REGISTER MODE ===================== */
            <div>
              <div className="mb-6">
                <h3 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                  Formulir Pendaftaran Akun Baru
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pilih jalur pendaftaran yang sesuai dengan peran Anda di Nexust:
                </p>

                {/* 3 Registration Track Selector */}
                <div className="grid grid-cols-3 gap-2 mt-3.5">
                  <button
                    type="button"
                    onClick={() => setRegCategory('bod')}
                    className={`p-3 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center gap-1.5 ${
                      regCategory === 'bod'
                        ? 'border-purple-600 bg-purple-50/70 text-purple-950 font-bold shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <Shield className="w-5 h-5 text-purple-700" />
                    <span className="text-xs font-bold block leading-tight">Dewan Direksi</span>
                    <span className="text-[10px] text-slate-500 block">BOD / Partner</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegCategory('staff')}
                    className={`p-3 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center gap-1.5 ${
                      regCategory === 'staff'
                        ? 'border-blue-600 bg-blue-50/70 text-blue-950 font-bold shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <Briefcase className="w-5 h-5 text-[#0051d5]" />
                    <span className="text-xs font-bold block leading-tight">Staf &amp; Tim</span>
                    <span className="text-[10px] text-slate-500 block">Konsultan / Tim</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegCategory('client')}
                    className={`p-3 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center gap-1.5 ${
                      regCategory === 'client'
                        ? 'border-teal-600 bg-teal-50/70 text-teal-950 font-bold shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <Building2 className="w-5 h-5 text-teal-700" />
                    <span className="text-xs font-bold block leading-tight">Klien Bisnis</span>
                    <span className="text-[10px] text-slate-500 block">Mitra UKM</span>
                  </button>
                </div>
              </div>

              <form className="space-y-4" onSubmit={handleRegisterSubmit}>
                {/* Notice banner based on category */}
                {regCategory === 'staff' && (
                  <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
                    <Shield className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                    <span>
                      <strong className="font-bold">Persetujuan Diperlukan:</strong> Pendaftaran staf tim Nexus akan berstatus <em>Pending Approval</em> dan wajib diverifikasi oleh Owner (Ahmad Fadli Taufik) sebelum dapat melihat data klien.
                    </span>
                  </div>
                )}

                {regCategory === 'bod' && (
                  <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-start gap-2">
                    <Shield className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                    <span>
                      <strong className="font-bold">Akses Eksekutif:</strong> Masukkan Kode Akses Otorisasi Dewan Direksi jika Anda telah menerima undangan resmi, atau kirim permohonan untuk verifikasi.
                    </span>
                  </div>
                )}

                {regCategory === 'client' && (
                  <div className="p-3 bg-teal-50/80 border border-teal-200 rounded-xl text-xs text-teal-900 flex items-start gap-2">
                    <Building2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                    <span>
                      <strong className="font-bold">Portal Transformasi Klien:</strong> Daftarkan usaha Anda untuk mendapatkan pendampingan intensif WFA dan akses ke roadmap bisnis.
                    </span>
                  </div>
                )}

                {/* Common Basic Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama Lengkap &amp; Gelar <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Contoh: Rian Pratama, S.Kom"
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0051d5]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      No. WhatsApp / Telepon <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="Contoh: 0812-3456-7890"
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0051d5]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alamat Email Resmi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0051d5]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Kata Sandi Baru <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0051d5]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Konfirmasi Kata Sandi <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Ketik ulang sandi"
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0051d5]"
                    />
                  </div>
                </div>

                {/* ================= Specific Fields per Category ================= */}
                {/* BOD Fields */}
                {regCategory === 'bod' && (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Posisi / Jabatan Dewan Direksi
                      </label>
                      <select
                        value={bodTitle}
                        onChange={(e) => setBodTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-600"
                      >
                        <option value="Managing Partner / Direksi">Managing Partner / Co-Founder</option>
                        <option value="Direktur Operasional & Konsultansi">Direktur Operasional &amp; Konsultansi</option>
                        <option value="Direktur Komersial & Kemitraan">Direktur Komersial &amp; Kemitraan</option>
                        <option value="Dewan Penasihat / Strategic Advisor">Dewan Penasihat / Strategic Advisor</option>
                        <option value="Komisaris Perusahaan">Komisaris Perusahaan</option>
                      </select>
                    </div>

                  </div>
                )}

                {/* Staff Fields */}
                {regCategory === 'staff' && (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Divisi Penugasan yang Diajukan <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={staffRole}
                        onChange={(e) => {
                          const r = e.target.value as UserRole;
                          setStaffRole(r);
                          if (r === 'konsultan') setStaffTitle('Konsultan Pendamping Bisnis');
                          else if (r === 'tim_grup') setStaffTitle('Fasilitator Mastermind & Grup');
                          else if (r === 'tim_konten') setStaffTitle('Spesialis Konten & Media');
                          else setStaffTitle('Staf Operasional & Administrasi');
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0051d5]"
                      >
                        <option value="konsultan">Konsultan Pendamping 1-on-1 (Business Coaching)</option>
                        <option value="tim_grup">Fasilitator Mastermind &amp; Tim Grup (Cohort)</option>
                        <option value="tim_konten">Tim Konten &amp; Media Pemasaran</option>
                        <option value="staf_operasional">Staf Operasional &amp; Administrasi</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Jabatan yang Diajukan
                      </label>
                      <input
                        type="text"
                        value={staffTitle}
                        onChange={(e) => setStaffTitle(e.target.value)}
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0051d5]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Pengalaman Ringkas / Alasan Bergabung
                      </label>
                      <textarea
                        rows={2}
                        value={staffNotes}
                        onChange={(e) => setStaffNotes(e.target.value)}
                        placeholder="Jelaskan spesialisasi bisnis Anda atau pengalaman membenahi UKM..."
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0051d5]"
                      />
                    </div>
                  </div>
                )}

                {/* Client Fields */}
                {regCategory === 'client' && (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Nama Usaha / Brand / PT <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={clientCompanyName}
                          onChange={(e) => setClientCompanyName(e.target.value)}
                          placeholder="Contoh: Kopi Nusantara Jaya"
                          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Sektor Industri Usaha
                        </label>
                        <select
                          value={clientIndustry}
                          onChange={(e) => setClientIndustry(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-600"
                        >
                          <option value="Food & Beverage">Kuliner / Food &amp; Beverage</option>
                          <option value="Fashion & Retail">Fashion &amp; Retail</option>
                          <option value="Jasa & Konsultansi">Jasa &amp; Layanan Profesional</option>
                          <option value="Manufaktur & Produksi">Manufaktur &amp; Kerajinan</option>
                          <option value="Teknologi & Digital">Teknologi &amp; Agensi Kreatif</option>
                          <option value="Kesehatan & Kecantikan">Kesehatan &amp; Kecantikan</option>
                          <option value="Agribisnis & Peternakan">Agribisnis &amp; Peternakan</option>
                          <option value="Lainnya">Lainnya</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Kota / Domisili Usaha <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={clientCity}
                          onChange={(e) => setClientCity(e.target.value)}
                          placeholder="Contoh: Surabaya, Bali, Jakarta"
                          className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Jumlah Tim / Karyawan
                        </label>
                        <select
                          value={clientTeamSize}
                          onChange={(e) => setClientTeamSize(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-600"
                        >
                          <option value="1-5 Karyawan">1 - 5 Karyawan</option>
                          <option value="6-15 Karyawan">6 - 15 Karyawan</option>
                          <option value="16-50 Karyawan">16 - 50 Karyawan</option>
                          <option value="Lebih dari 50 Karyawan">&gt; 50 Karyawan</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Peminatan Program Pendampingan
                      </label>
                      <select
                        value={clientProgramInterest}
                        onChange={(e) => setClientProgramInterest(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-600"
                      >
                        <option value="Pendampingan Fundamental 12 Minggu">
                          Pendampingan Fundamental 12 Minggu (SOP, Kas &amp; Tim)
                        </option>
                        <option value="Mastermind Cohort Tim Grup">
                          Mastermind Cohort Tim Grup (Mentoring Kolektif)
                        </option>
                        <option value="Konsultasi Private Retainer">
                          Konsultasi Private Retainer Eksklusif
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Kendala Utama Bisnis Saat Ini
                      </label>
                      <textarea
                        rows={2}
                        value={clientNotes}
                        onChange={(e) => setClientNotes(e.target.value)}
                        placeholder="Contoh: Kas tercampur antara pribadi dan toko, tim belum mandiri, butuh SOP..."
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#00236f] hover:bg-[#1e3a8a] text-white py-2.5 px-4 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 mt-4"
                >
                  {isSubmitting ? (
                    'Mengirim Pendaftaran...'
                  ) : (
                    <>
                      Kirim Pendaftaran Akun {regCategory === 'bod' ? 'BOD' : regCategory === 'staff' ? 'Staf' : 'Klien'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-500">
                  Sudah memiliki akun terdaftar?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setError(null);
                    }}
                    className="font-bold text-[#0051d5] hover:underline cursor-pointer"
                  >
                    Masuk di sini →
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* Quick Demo Simulator for Evaluators — hanya di DEMO_MODE */}
          {DEMO_MODE && (
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Akses Cepat Pengujian (1-Klik):
                </span>
              </div>
              <span className="text-[10px] text-slate-400">Termasuk akun Pending Approval</span>
            </div>

            <p className="text-[11px] text-slate-500 mb-3">
              Klik profil di bawah untuk menguji alur hak akses dan fitur persetujuan Owner secara langsung:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {demoUsersList.slice(0, 8).map((user) => {
                const isPending = user.status === 'pending';
                const roleBadge =
                  user.role === 'owner'
                    ? 'bg-purple-100 text-purple-800'
                    : user.role === 'konsultan' || user.role === 'consultant'
                    ? 'bg-blue-100 text-blue-800'
                    : user.role === 'tim_grup'
                    ? 'bg-amber-100 text-amber-800'
                    : user.role === 'tim_konten'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-teal-100 text-teal-800';

                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleSelectDemoAccount(user.id)}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      isPending
                        ? 'border-amber-300 bg-amber-50/40 hover:bg-amber-100/60'
                        : 'border-slate-200 hover:border-[#0051d5] hover:bg-blue-50/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-semibold text-slate-900 truncate">
                        {user.displayName}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {isPending && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-amber-200 text-amber-900">
                            Pending
                          </span>
                        )}
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${roleBadge}`}>
                          {user.role}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500 truncate">
                      {user.title || user.companyName || user.email}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};
