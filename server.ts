import "dotenv/config";
import express from "express";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import path from "path";

import axios from "axios";

const app = express();
app.set('trust proxy', 1);
const PORT = 3000;

// Proxy endpoint to fetch HTML content
app.get("/api/proxy", async (req, res) => {
  const { url } = req.query;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      timeout: 10000,
    });
    res.send(response.data);
  } catch (error: any) {
    console.error("Proxy error:", error.message);
    res.status(500).json({ error: `Failed to fetch URL: ${error.message}` });
  }
});

// Rate limiter: 2 requests per 24 hours per IP
const limiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 2, // Limit each IP to 2 requests per `window`
  message: { error: "You have reached the daily limit of 2 analyses. Please try again tomorrow." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors());
app.use(express.json());

// Gemini initialization (Backend only - Key is hidden from client)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

app.post("/api/analyze", limiter, async (req, res) => {
  const { images } = req.body;

  if (!images || !Array.isArray(images)) {
    return res.status(400).json({ error: "Invalid images data" });
  }

  const systemInstruction = `
    You are a Web Performance and Accessibility Expert. 
    Analyze the provided list of images extracted from a website's HTML.
    For each image, determine its likely role based on its class names, dimensions, and context.
    
    Provide specific optimization recommendations:
    1. Role: What is this image? (Hero, Icon, Avatar, Gallery, Content)
    2. Suggested Formats: Modern formats like WebP or AVIF.
    3. Suggested Widths: An array of pixel widths suitable for a responsive 'srcset'.
    4. Sizes Attribute: A recommended 'sizes' attribute string for responsive behavior.
    5. Lazy Load: Boolean, true if it should be lazy loaded, false if it's likely above-the-fold (like a Hero).
    6. Alt Text: If the current alt text is missing or poor, suggest an improvement based on the context (or note if it's decorative).
    7. Reasoning: A brief explanation of why you chose these settings.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: JSON.stringify(images),
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              imageId: { type: Type.STRING },
              role: { type: Type.STRING },
              suggestedFormats: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING } 
              },
              suggestedWidths: { 
                type: Type.ARRAY, 
                items: { type: Type.NUMBER } 
              },
              sizesAttribute: { type: Type.STRING },
              lazyLoad: { type: Type.BOOLEAN },
              altTextImprovement: { type: Type.STRING },
              reasoning: { type: Type.STRING }
            },
            required: ["imageId", "role", "suggestedFormats", "suggestedWidths", "sizesAttribute", "lazyLoad", "reasoning"]
          }
        }
      }
    });

    res.json(JSON.parse(response.text || "[]"));
  } catch (error: any) {
    console.error("Gemini backend error:", error);
    res.status(500).json({ error: error.message || "AI analysis failed" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
