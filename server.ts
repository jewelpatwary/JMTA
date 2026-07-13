import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey ? new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  }) : null;

  const parseMessageManually = (messageText: string, senderName: string) => {
    const words = messageText.split(/\s+/);
    let parsedAgentName = senderName || "Agent";
    let parsedAmountBdt = 0;
    let parsedRate = 0;
    let parsedAmountMyr = 0;
    let parsedType = "bkash";
    let parsedDirection = "order";

    for (const word of words) {
      if (/^\d+$/.test(word) && Number(word) > 1000) {
        parsedAmountBdt = Number(word);
      } else if (/^\d+\.\d+$/.test(word)) {
        parsedRate = Number(word);
      } else if (['bkash', 'bank', 'nagad'].includes(word.toLowerCase())) {
        parsedType = word.toLowerCase();
      } else if (['payment', 'pay', 'payout'].includes(word.toLowerCase())) {
        parsedDirection = "payment";
      }
    }

    if (parsedAmountBdt && parsedRate) {
      parsedAmountMyr = Number((parsedAmountBdt / parsedRate).toFixed(2));
    }

    return {
      parsedAgentName,
      parsedAmountBdt,
      parsedRate,
      parsedAmountMyr,
      parsedType,
      parsedDirection,
      isFallback: true
    };
  };

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
