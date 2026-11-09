/**
 * Cloudflare Worker untuk Nexust Client Hub.
 * - /api/*  -> ditangani di sini (fitur AI Gemini).
 * - lainnya -> file statis hasil `vite build` (folder dist) lewat binding ASSETS,
 *              dengan fallback ke index.html (SPA) yang diatur di wrangler.jsonc.
 */
import { summarizeSession, HttpError } from '../api/summarize';
import { verifyFirebaseIdToken } from '../api/firebaseAuth';

export interface Env {
  ASSETS: Fetcher;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  FIREBASE_PROJECT_ID: string;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return json({ status: 'ok', timestamp: new Date().toISOString() });
    }

    if (url.pathname === '/api/ai/summarize-session') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
      try {
        await verifyFirebaseIdToken(request.headers.get('Authorization'), env.FIREBASE_PROJECT_ID);
        const body = await request.json().catch(() => {
          throw new HttpError(400, 'Body permintaan harus JSON.');
        });
        const data = await summarizeSession(env.GEMINI_API_KEY, body as any, env.GEMINI_MODEL);
        return json({ success: true, data });
      } catch (error: any) {
        const status = error instanceof HttpError ? error.status : 500;
        if (status >= 500) console.error('Gemini Summarization error:', error);
        return json({ error: error?.message || 'Gagal memproses ringkasan dengan AI.' }, status);
      }
    }

    if (url.pathname.startsWith('/api/')) {
      return json({ error: 'Not found' }, 404);
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
