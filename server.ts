import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();

const portArgIndex = process.argv.indexOf('--port');
const PORT = Number(
  portArgIndex !== -1 && process.argv[portArgIndex + 1]
    ? process.argv[portArgIndex + 1]
    : process.env.PORT || 3000
);

const hostArgIndex = process.argv.indexOf('--host');
const HOST =
  hostArgIndex !== -1 && process.argv[hostArgIndex + 1]
    ? process.argv[hostArgIndex + 1]
    : '0.0.0.0';

app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Lazy initialize GoogleGenAI SDK on demand with User-Agent header
function getAiClient() {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// API endpoint for summarizing session notes with Gemini
app.post('/api/ai/summarize-session', async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY belum dikonfigurasi pada server.' });
    }
    const ai = getAiClient();
    const { agenda, notes, rawContent, clientName, consultantName } = req.body;

    if (!notes && !rawContent && !agenda) {
      return res.status(400).json({ error: 'Catatan sesi atau agenda tidak boleh kosong.' });
    }

    const promptText = `
Anda adalah asisten AI eksekutif senior untuk firma konsultan bisnis "Nexust Growth Partner" (WFA Business Advisory).
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
      model: 'gemini-3.8-flash',
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
    const parsedData = JSON.parse(outputText);
    return res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error('Gemini Summarization error:', error);
    return res.status(500).json({
      error: error?.message || 'Gagal memproses ringkasan dengan AI.',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const path = await import('path');
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });
}

startServer();
