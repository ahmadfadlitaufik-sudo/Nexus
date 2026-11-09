import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { summarizeSession, HttpError } from './api/summarize';
import { verifyFirebaseIdToken } from './api/firebaseAuth';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

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

// API endpoint for summarizing session notes with Gemini (logika ada di api/summarize.ts)
app.post('/api/ai/summarize-session', async (req, res) => {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
    await verifyFirebaseIdToken(req.headers.authorization, projectId);
    const data = await summarizeSession(process.env.GEMINI_API_KEY, req.body, process.env.GEMINI_MODEL);
    return res.json({ success: true, data });
  } catch (error: any) {
    const status = error instanceof HttpError ? error.status : 500;
    if (status >= 500) console.error('Gemini Summarization error:', error);
    return res.status(status).json({
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
