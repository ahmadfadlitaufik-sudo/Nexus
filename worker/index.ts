/**
 * Cloudflare Worker untuk Nexus Client Hub.
 * - /api/auth/*  -> login, daftar, sesi (worker/auth.ts, worker/google.ts)
 * - /api/data    -> baca/tulis database D1 dengan aturan akses (worker/data.ts)
 * - /api/ai/*    -> ringkasan sesi Gemini (worker/ai.ts)
 * - lainnya      -> file statis aplikasi React (binding ASSETS, fallback SPA)
 */
import { Env, isTeam } from './env';
import { HttpError, json, readJson } from './http';
import { getSessionProfile, handleAuth } from './auth';
import { handleGoogle } from './google';
import { handleData } from './data';
import { summarizeSession } from './ai';

async function handleApi(request: Request, env: Env, path: string): Promise<Response> {
  if (path === '/api/health') {
    return json({ status: 'ok', timestamp: new Date().toISOString() });
  }

  if (path.startsWith('/api/auth/google/')) {
    const res = await handleGoogle(request, env, path);
    if (res) return res;
  }

  const me = await getSessionProfile(request, env);

  if (path.startsWith('/api/auth/')) {
    const res = await handleAuth(request, env, path, me);
    if (res) return res;
  }

  if (path === '/api/data') {
    return handleData(request, env, me);
  }

  if (path === '/api/ai/summarize-session') {
    if (request.method !== 'POST') throw new HttpError(405, 'Method not allowed');
    if (!me) throw new HttpError(401, 'Silakan login terlebih dahulu untuk memakai fitur AI.');
    if (!isTeam(me)) throw new HttpError(403, 'Fitur AI hanya untuk tim internal.');
    const body = await readJson(request);
    const data = await summarizeSession(env.GEMINI_API_KEY, body, env.GEMINI_MODEL);
    return json({ success: true, data });
  }

  throw new HttpError(404, 'Not found');
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }
    try {
      return await handleApi(request, env, url.pathname);
    } catch (error: any) {
      const status = error instanceof HttpError ? error.status : 500;
      if (status >= 500) console.error('API error:', url.pathname, error);
      const message =
        status >= 500 && !(error instanceof HttpError)
          ? 'Terjadi kesalahan pada server. Silakan coba lagi.'
          : error?.message || 'Terjadi kesalahan.';
      return json({ error: message }, status);
    }
  },
} satisfies ExportedHandler<Env>;
