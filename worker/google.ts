/**
 * Login dengan Google (OAuth 2.0 / OpenID Connect), aktif bila GOOGLE_CLIENT_ID dan
 * GOOGLE_CLIENT_SECRET diisi. Redirect URI yang didaftarkan di Google Cloud Console:
 *   https://<domain-anda>/api/auth/google/callback
 */
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { Env } from './env';
import { cookie, getCookie } from './http';
import { randomToken } from './crypto';
import { googleEnabled, loginWithGoogleIdentity } from './auth';

const STATE_COOKIE = 'nx_oauth_state';
const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

function redirectUri(request: Request): string {
  return `${new URL(request.url).origin}/api/auth/google/callback`;
}

function redirect(location: string, setCookies: string[] = []): Response {
  const headers = new Headers({ Location: location, 'Cache-Control': 'no-store' });
  for (const c of setCookies) headers.append('Set-Cookie', c);
  return new Response(null, { status: 302, headers });
}

function errorRedirect(message: string): Response {
  return redirect(`/?login_error=${encodeURIComponent(message)}`);
}

export async function handleGoogle(request: Request, env: Env, path: string): Promise<Response | null> {
  if (request.method !== 'GET') return null;
  const secure = new URL(request.url).protocol === 'https:';

  if (path === '/api/auth/google/start') {
    if (!googleEnabled(env)) return errorRedirect('Login Google belum diaktifkan.');
    const state = randomToken(16);
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID!,
      redirect_uri: redirectUri(request),
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    });
    return redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`, [
      cookie(STATE_COOKIE, state, 600, secure),
    ]);
  }

  if (path === '/api/auth/google/callback') {
    if (!googleEnabled(env)) return errorRedirect('Login Google belum diaktifkan.');
    const url = new URL(request.url);
    const clearState = cookie(STATE_COOKIE, '', 0, secure);
    const state = url.searchParams.get('state');
    const code = url.searchParams.get('code');
    if (!state || state !== getCookie(request, STATE_COOKIE) || !code) {
      return errorRedirect('Sesi login Google tidak valid. Silakan coba lagi.');
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID!,
        client_secret: env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri(request),
        grant_type: 'authorization_code',
      }),
    });
    const tokenJson = (await tokenRes.json().catch(() => ({}))) as { id_token?: string };
    if (!tokenRes.ok || !tokenJson.id_token) {
      return errorRedirect('Gagal menyelesaikan login Google.');
    }

    try {
      const { payload } = await jwtVerify(tokenJson.id_token, GOOGLE_JWKS, {
        issuer: ['https://accounts.google.com', 'accounts.google.com'],
        audience: env.GOOGLE_CLIENT_ID,
      });
      if (!payload.sub || typeof payload.email !== 'string' || payload.email_verified !== true) {
        return errorRedirect('Email akun Google belum terverifikasi.');
      }
      const sessionCookie = await loginWithGoogleIdentity(request, env, {
        sub: payload.sub,
        email: payload.email,
        name: typeof payload.name === 'string' ? payload.name : undefined,
        picture: typeof payload.picture === 'string' ? payload.picture : undefined,
      });
      return redirect('/', [sessionCookie, clearState]);
    } catch (err) {
      console.error('Google login error:', err);
      return errorRedirect('Gagal memverifikasi akun Google.');
    }
  }

  return null;
}
