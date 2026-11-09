import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Activity,
  Layers,
  Sparkles,
  RefreshCw,
  HelpCircle,
  X,
  Play,
  Terminal,
} from 'lucide-react';
import { Session, SessionInternal, SessionAuditLog, UserRole } from '../types';
import { getSessionAuditLogs, recordSessionAuditLog, verifySessionAccessRule } from '../services/db';
import { formatWITA } from '../utils/formatters';

interface SessionAuditSummaryProps {
  session?: Session | null;
  sessionId?: string;
  clientName?: string;
  isModal?: boolean;
  onClose?: () => void;
}

export const SessionAuditSummary: React.FC<SessionAuditSummaryProps> = ({
  session,
  sessionId = session?.id || 'sess-1',
  clientName = 'Klien Binaan',
  isModal = false,
  onClose,
}) => {
  const { userProfile } = useAuth();
  const [auditLogs, setAuditLogs] = useState<SessionAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Access Simulator State
  const [simRole, setSimRole] = useState<string>('klien');
  const [simTarget, setSimTarget] = useState<'sessions' | 'session_internals'>('session_internals');
  const [simAssigned, setSimAssigned] = useState<boolean>(true);
  const [simClientSelf, setSimClientSelf] = useState<boolean>(true);
  const [simResult, setSimResult] = useState<{
    isAuthorized: boolean;
    ruleClause: string;
    explanation: string;
  } | null>(null);

  const loadAuditData = async () => {
    setLoading(true);
    try {
      const logs = await getSessionAuditLogs(sessionId);
      setAuditLogs(logs);
    } catch (err) {
      console.error('Error loading session audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditData();
    runSimulation('klien', 'session_internals', true, true);
  }, [sessionId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAuditData();
    setIsRefreshing(false);
  };

  const runSimulation = (
    role: string,
    target: 'sessions' | 'session_internals',
    assigned: boolean,
    isSelf: boolean
  ) => {
    const res = verifySessionAccessRule(role, target, assigned, isSelf);
    setSimResult(res);
  };

  // Run a live simulated test and record it in the audit trail
  const handleTestAndRecord = async () => {
    const res = verifySessionAccessRule(simRole, simTarget, simAssigned, simClientSelf);
    const roleName =
      simRole === 'owner'
        ? 'Owner Eksekutif'
        : simRole === 'konsultan'
        ? 'Konsultan Pendamping'
        : simRole === 'klien'
        ? 'Klien Binaan'
        : simRole === 'tim_konten'
        ? 'Tim Konten & Media'
        : 'Tim Grup / Tamu';

    const newLog = await recordSessionAuditLog({
      sessionId,
      clientId: session?.clientId || 'client-1',
      userId: `sim-${simRole}`,
      userName: `Simulasi: Akun ${roleName}`,
      userRole: simRole as UserRole,
      targetCollection: simTarget,
      accessType: res.isAuthorized
        ? simTarget === 'session_internals'
          ? 'READ_INTERNAL'
          : 'READ_PUBLIC'
        : 'UNAUTHORIZED_ATTEMPT',
      isAuthorized: res.isAuthorized,
      securityRuleMatched: res.ruleClause,
      details: res.explanation,
      clientIp: '127.0.0.1 (Verifikator Internal Admin)',
    });

    setAuditLogs((prev) => [newLog, ...prev]);
    setSimResult(res);
  };

  // Last accessed log
  const lastLog = auditLogs[0];
  const totalAttempts = auditLogs.length;
  const authorizedCount = auditLogs.filter((l) => l.isAuthorized).length;
  const blockedCount = auditLogs.filter((l) => !l.isAuthorized).length;

  const content = (
    <div className="space-y-6 text-xs text-slate-800">
      {/* Top Banner & Integrity State */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-[#00236f] to-[#1e3a8a] text-white space-y-4 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 text-emerald-400 flex items-center justify-center font-bold shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white font-['Plus_Jakarta_Sans']">
                  Audit Integritas Data Sesi &amp; Aturan Akses Server
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-400/30">
                  RULES AKTIF
                </span>
              </div>
              <p className="text-[11px] text-blue-200 mt-0.5">
                Sesi ID: <span className="font-mono text-white">{sessionId}</span> • Entitas: {clientName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Segarkan Log</span>
            </button>
            {isModal && onClose && (
              <button
                onClick={onClose}
                className="p-1.5 text-blue-200 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* 3 Metric Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/15">
          <div className="bg-white/10 p-2.5 rounded-xl border border-white/10">
            <span className="text-[10px] text-blue-200 uppercase font-bold tracking-wider block">
              Pemisahan Dokumen
            </span>
            <div className="text-xs font-bold text-white flex items-center gap-1 mt-0.5">
              <Lock className="w-3.5 h-3.5 text-amber-300" />
              <span>2 Dokumen Terisolasi</span>
            </div>
            <span className="text-[10px] text-slate-300">sessions vs session_internals</span>
          </div>

          <div className="bg-white/10 p-2.5 rounded-xl border border-white/10">
            <span className="text-[10px] text-blue-200 uppercase font-bold tracking-wider block">
              Akses Terotorisasi
            </span>
            <div className="text-xs font-bold text-emerald-300 flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{authorizedCount} Peristiwa Sah</span>
            </div>
            <span className="text-[10px] text-slate-300">Sesuai RBAC Server</span>
          </div>

          <div className="bg-white/10 p-2.5 rounded-xl border border-white/10">
            <span className="text-[10px] text-blue-200 uppercase font-bold tracking-wider block">
              Anomali / Akses Ilegal Dicegah
            </span>
            <div className="text-xs font-bold text-rose-300 flex items-center gap-1 mt-0.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{blockedCount} Upaya Terblokir</span>
            </div>
            <span className="text-[10px] text-slate-300">Otomatis ditolak server</span>
          </div>
        </div>
      </div>

      {/* SIAPA YANG TERAKHIR MENGAKSES SESI (HIGHLIGHT CARD) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-[#00236f]" />
            Pengakses Terakhir Sesi Ini
          </span>
          <span className="text-[10px] text-slate-400">Status Integritas Real-time</span>
        </div>

        {loading ? (
          <div className="p-6 text-center text-slate-400">Memverifikasi log integritas sesi...</div>
        ) : !lastLog ? (
          <div className="p-6 text-center text-slate-400">Belum ada catatan aktivitas akses pada sesi ini.</div>
        ) : (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${
                  lastLog.isAuthorized
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {lastLog.isAuthorized ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">{lastLog.userName}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 uppercase">
                    Peran: {lastLog.userRole}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      lastLog.isAuthorized
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    {lastLog.isAuthorized ? '✓ TEROTORISASI' : '✕ AKSES TIDAK SAH (DICEGAH)'}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{lastLog.details}</p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 pt-1">
                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    Waktu: {formatWITA(lastLog.accessedAt, true)}
                  </span>
                  <span>
                    Koleksi: <code className="bg-slate-200/80 px-1.5 py-0.5 rounded text-[10px] font-mono">{lastLog.targetCollection}</code>
                  </span>
                  {lastLog.clientIp && <span>IP / Lokasi: {lastLog.clientIp}</span>}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white border border-slate-200/90 text-right shrink-0 md:max-w-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Aturan Akses Server
              </span>
              <p className="font-mono text-[11px] font-bold text-[#00236f] truncate mt-0.5" title={lastLog.securityRuleMatched}>
                {lastLog.securityRuleMatched}
              </p>
              <span className="text-[10px] text-emerald-600 font-semibold mt-1 inline-block">
                Tervalidasi Aturan Keamanan V2
              </span>
            </div>
          </div>
        )}
      </div>

      {/* MATRIX PERBANDINGAN HAK AKSES PER PERAN BERDASARKAN FIRESTORE RULES */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900 font-['Plus_Jakarta_Sans'] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#00236f]" />
            <span>Matriks Otorisasi Akses Data Sesi Berdasarkan Aturan Akses Server</span>
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Sistem memisahkan kolom data catatan internal ke dokumen terpisah agar Security Rules dapat mengisolasi hak baca secara absolut.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">Peran (User Role)</th>
                <th className="p-3">Dokumen Publik (sessions)</th>
                <th className="p-3">Dokumen Internal (session_internals)</th>
                <th className="p-3">Status Otorisasi Server</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50/50">
                <td className="p-3 font-bold text-slate-900">
                  <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-bold text-[10px] mr-1.5 uppercase">
                    Owner
                  </span>
                  Semua Owner
                </td>
                <td className="p-3 text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Baca &amp; Tulis Penuh
                </td>
                <td className="p-3 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" /> Baca &amp; Tulis Catatan Rahasia
                </td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[10px] border border-emerald-200">
                    isOwner() → Full Access
                  </span>
                </td>
              </tr>

              <tr className="hover:bg-slate-50/50">
                <td className="p-3 font-bold text-slate-900">
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold text-[10px] mr-1.5 uppercase">
                    Konsultan
                  </span>
                  Konsultan Ditugaskan
                </td>
                <td className="p-3 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" /> Agenda &amp; Catatan Dibagikan
                </td>
                <td className="p-3 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" /> Catatan Internal Klien Binaan
                </td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 font-bold text-[10px] border border-blue-200">
                    isConsultant() → Assigned Only
                  </span>
                </td>
              </tr>

              <tr className="bg-amber-50/20 hover:bg-amber-50/40">
                <td className="p-3 font-bold text-slate-900">
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold text-[10px] mr-1.5 uppercase">
                    Klien
                  </span>
                  Pemilik Bisnis UKM
                </td>
                <td className="p-3 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" /> Sesi &amp; Catatan Dibagikan
                </td>
                <td className="p-3 text-rose-600 font-bold flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> DITOLAK KERAS (ISOLASI DOKUMEN)
                </td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] border border-amber-300">
                    Strict Zero-Trust Separation
                  </span>
                </td>
              </tr>

              <tr className="bg-rose-50/20 hover:bg-rose-50/40">
                <td className="p-3 font-bold text-slate-900">
                  <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-900 font-bold text-[10px] mr-1.5 uppercase">
                    Tim Konten
                  </span>
                  Media &amp; Copywriter
                </td>
                <td className="p-3 text-rose-600 font-bold">
                  <XCircle className="w-3.5 h-3.5 inline mr-1" /> Ditolak (Koleksi Klien Privat)
                </td>
                <td className="p-3 text-rose-600 font-bold">
                  <XCircle className="w-3.5 h-3.5 inline mr-1" /> Ditolak (Koleksi Internal)
                </td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 font-bold text-[10px] border border-rose-200">
                    !isTimKonten() Rule Active
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* INTERACTIVE ACCESS RULE SIMULATOR */}
      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#00236f] text-white">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Simulator Verifikasi Aturan Akses Server Real-Time
              </h4>
              <p className="text-[11px] text-slate-500">
                Uji coba secara langsung apakah kombinasi peran dan target dokumen sesi lolos otorisasi aturan keamanan.
              </p>
            </div>
          </div>

          <button
            onClick={handleTestAndRecord}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#00236f] hover:bg-[#1e3a8a] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Jalankan &amp; Catat Audit</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3.5 bg-white rounded-xl border border-slate-200">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Pilih Peran Akun</label>
            <select
              value={simRole}
              onChange={(e) => {
                setSimRole(e.target.value);
                runSimulation(e.target.value, simTarget, simAssigned, simClientSelf);
              }}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
            >
              <option value="owner">Owner (Eksekutif)</option>
              <option value="konsultan">Konsultan</option>
              <option value="klien">Klien (Pemilik Bisnis)</option>
              <option value="tim_konten">Tim Konten</option>
              <option value="tim_grup">Tim Grup / Fasilitator</option>
              <option value="unauthenticated">Tamu / Tanpa Login</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Target Dokumen</label>
            <select
              value={simTarget}
              onChange={(e) => {
                const val = e.target.value as 'sessions' | 'session_internals';
                setSimTarget(val);
                runSimulation(simRole, val, simAssigned, simClientSelf);
              }}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
            >
              <option value="sessions">sessions (Agenda &amp; Catatan Bersama)</option>
              <option value="session_internals">session_internals (Catatan Rahasia Tim)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Status Penugasan</label>
            <select
              value={simAssigned ? 'yes' : 'no'}
              onChange={(e) => {
                const val = e.target.value === 'yes';
                setSimAssigned(val);
                runSimulation(simRole, simTarget, val, simClientSelf);
              }}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
            >
              <option value="yes">Resmi Ditugaskan ke Klien Ini</option>
              <option value="no">Bukan Konsultan Klien Ini</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Kepemilikan Akun Klien</label>
            <select
              value={simClientSelf ? 'yes' : 'no'}
              onChange={(e) => {
                const val = e.target.value === 'yes';
                setSimClientSelf(val);
                runSimulation(simRole, simTarget, simAssigned, val);
              }}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
            >
              <option value="yes">Sesi Milik Bisnis Sendiri</option>
              <option value="no">Sesi Bisnis Klien Lain</option>
            </select>
          </div>
        </div>

        {/* Simulation Output Banner */}
        {simResult && (
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 transition ${
              simResult.isAuthorized
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-rose-50 border-rose-200 text-rose-950'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {simResult.isAuthorized ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-rose-600" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs uppercase tracking-wider">
                  Hasil Evaluasi Security Rules:
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    simResult.isAuthorized
                      ? 'bg-emerald-200 text-emerald-900'
                      : 'bg-rose-200 text-rose-900'
                  }`}
                >
                  {simResult.isAuthorized ? '✓ ALLOW (DIIZINKAN)' : '✕ DENIED (DITOLAK)'}
                </span>
              </div>
              <p className="text-xs leading-relaxed font-medium">{simResult.explanation}</p>
              <div className="text-[11px] font-mono opacity-80 pt-0.5">
                Evaluated Rule: {simResult.ruleClause}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RIWAYAT AUDIT AKSES LENGKAP */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-800">
            Jejak Audit Akses Sesi ({auditLogs.length} Entri Tercatat)
          </span>
          <span className="text-[10px] text-slate-400">Diurutkan berdasarkan waktu terbaru</span>
        </div>

        <div className="space-y-2.5 max-h-80 overflow-y-auto">
          {auditLogs.map((log) => (
            <div
              key={log.id}
              className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition ${
                log.isAuthorized
                  ? 'bg-white border-slate-200 hover:bg-slate-50'
                  : 'bg-rose-50/40 border-rose-200'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 shrink-0">
                  {log.isAuthorized ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600" />
                  )}
                </span>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{log.userName}</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded font-semibold uppercase">
                      {log.userRole}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        log.isAuthorized
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {log.isAuthorized ? 'Terotorisasi' : 'Dicegah (Blocked)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">{log.details}</p>
                  <div className="text-[10px] text-slate-400 flex items-center gap-2">
                    <span>Target: {log.targetCollection}</span>
                    <span>•</span>
                    <span>Rule: {log.securityRuleMatched}</span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0 text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700 block">{formatWITA(log.accessedAt, true)}</span>
                <span className="text-[10px] text-slate-400">{log.clientIp || 'Aplikasi Internal'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
          {content}
        </div>
      </div>
    );
  }

  return content;
};
