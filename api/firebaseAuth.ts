/**
 * Verifikasi Firebase ID token (dikirim browser di header Authorization: Bearer <token>).
 * Berjalan di Node (server.ts) maupun Cloudflare Workers.
 */
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { HttpError } from './summarize';

const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

export interface FirebaseUserClaims extends JWTPayload {
  email?: string;
  email_verified?: boolean;
}

export async function verifyFirebaseIdToken(
  authorizationHeader: string | null | undefined,
  projectId: string
): Promise<FirebaseUserClaims> {
  const match = /^Bearer\s+(.+)$/i.exec(authorizationHeader || '');
  if (!match) {
    throw new HttpError(401, 'Silakan login terlebih dahulu untuk memakai fitur AI.');
  }
  try {
    const { payload } = await jwtVerify(match[1], JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
    if (!payload.sub) throw new Error('missing sub');
    return payload as FirebaseUserClaims;
  } catch {
    throw new HttpError(401, 'Sesi login tidak valid atau kedaluwarsa. Silakan login ulang.');
  }
}
