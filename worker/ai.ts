/**
 * Ringkasan sesi dengan Gemini AI (dipanggil dari worker/index.ts).
 */
import { GoogleGenAI, Type } from '@google/genai';
import { HttpError } from './http';

export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

export interface SummarizeRequest {
  agenda?: string;
  notes?: string;
  rawContent?: string;
  clientName?: string;
  consultantName?: string;
}

const MAX_INPUT_CHARS = 50_000;

export async function summarizeSession(
  apiKey: string | undefined,
  input: SummarizeRequest,
  model?: string
): Promise<unknown> {
  if (!apiKey) {
    throw new HttpError(500, 'GEMINI_API_KEY belum dikonfigurasi pada server.');
  }
  const { agenda, notes, rawContent, clientName, consultantName } = input || {};
  if (!notes && !rawContent && !agenda) {
    throw new HttpError(400, 'Catatan sesi atau agenda tidak boleh kosong.');
  }
  const totalLength = [agenda, notes, rawContent, clientName, consultantName]
    .map((v) => (typeof v === 'string' ? v.length : 0))
    .reduce((a, b) => a + b, 0);
  if (totalLength > MAX_INPUT_CHARS) {
    throw new HttpError(413, 'Catatan sesi terlalu panjang untuk diringkas sekaligus.');
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });

  const promptText = `
Anda adalah asisten AI eksekutif senior untuk firma konsultan bisnis "Nexus Growth Partner" (WFA Business Advisory).
Tugas Anda: Menganalisis dan meringkas notulensi sesi pendampingan bisnis klien UKM.

Data Sesi:
- Klien / Bisnis: ${clientName || 'Klien'}
- Konsultan: ${consultantName || 'Konsultan Bisnis'}
- Agenda: ${agenda || '-'}
- Catatan Kasar / Diskusi Sesi:
${notes || rawContent || agenda}

Instruksi Output:
1. Ringkasan Dibagikan (catatan_dibagikan): Buat resume yang profesional, konstruktif, dan jelas untuk dibaca oleh Klien (poin pencapaian, keputusan, dan langkah perbaikan).
2. Ringkasan Internal (catatan_internal): Buat observasi kritis, analisis hambatan internal, dinamika tim/owner, dan mitigasi risiko yang KHUSUS dibaca tim internal konsultan.
3. Usulan Action Items (usulan_action_items): 2-5 butir tugas konkret hasil sesi dengan PIC (Klien/Konsultan/Tim) dan estimasi tenggat waktu yang realistis (format YYYY-MM-DD).
`;

  const response = await ai.models.generateContent({
    model: model || DEFAULT_GEMINI_MODEL,
    contents: promptText,
    config: {
      systemInstruction:
        'Anda adalah konsultan bisnis profesional Indonesia. Berikan output dalam format JSON sesuai schema.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          catatan_dibagikan: {
            type: Type.STRING,
            description: 'Resume hasil pertemuan yang dibagikan ke klien.',
          },
          catatan_internal: {
            type: Type.STRING,
            description: 'Observasi dan catatan rahasia internal tim konsultan.',
          },
          key_observations: {
            type: Type.STRING,
            description: 'Satu kalimat kesimpulan strategis.',
          },
          usulan_action_items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                assigneeName: { type: Type.STRING },
                assigneeRole: {
                  type: Type.STRING,
                  enum: ['Klien', 'Konsultan', 'Tim'],
                },
                deadline: { type: Type.STRING },
              },
              required: ['title', 'assigneeRole'],
            },
          },
        },
        required: [
          'catatan_dibagikan',
          'catatan_internal',
          'key_observations',
          'usulan_action_items',
        ],
      },
    },
  });

  const outputText = response.text || '{}';
  try {
    return JSON.parse(outputText);
  } catch {
    throw new HttpError(502, 'Respons AI tidak dalam format yang diharapkan. Silakan coba lagi.');
  }
}
