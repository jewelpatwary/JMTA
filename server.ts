import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust proxy for Cloud Run/Nginx
  app.set('trust proxy', true);

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  // Initialize Vite or Static serving
  if (process.env.NODE_ENV !== "production") {
    console.log('🛠️ Initializing Vite middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log('✅ Vite middleware ready.');
  } else {
    console.log('📦 Serving static files from dist...');
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server listening on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('❌ FATAL ERROR STARTING SERVER:', err);
});


import { put } from "@vercel/blob";  // ← Add at top

// Add this route BEFORE the Vite middleware section:
app.post('/api/save-data', async (req, res) => {
  try {
    const { url } = await put(
      'data/app-data.json',
      JSON.stringify(req.body),
      {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
      }
    );
    res.json({ success: true, url });
  } catch (error) {
    console.error('Blob save error:', error);
    res.status(500).json({ error: 'Failed to save data' });
  }
});