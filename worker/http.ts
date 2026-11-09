export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  const h = new Headers(headers);
  h.set('Content-Type', 'application/json; charset=utf-8');
  h.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(data), { status, headers: h });
}

/** Ambil body JSON. Wajib Content-Type JSON (melindungi dari kiriman form lintas situs / CSRF). */
export async function readJson<T = any>(request: Request): Promise<T> {
  const type = request.headers.get('Content-Type') || '';
  if (!type.toLowerCase().includes('application/json')) {
    throw new HttpError(415, 'Content-Type harus application/json.');
  }
  try {
    return (await request.json()) as T;
  } catch {
    throw new HttpError(400, 'Body permintaan harus JSON yang valid.');
  }
}

export function getCookie(request: Request, name: string): string | null {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

export function cookie(name: string, value: string, maxAgeSeconds: number, secure: boolean): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'SameSite=Lax',
    'HttpOnly',
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}
