import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Cloudinary Setup (Lazy loaded check)
function getCloudinary() {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.warn("Cloudinary environment variables missing. Uploads will fail.");
      return null;
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  return cloudinary;
}

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

async function startServer() {
  // Ensure uploads dir exists
  if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
  }

  const app = express();
  const httpServer = createServer(app);
  const PORT = 3000;

  app.use(express.json());

  // Upload Endpoint
  app.post("/api/upload", upload.single('video'), async (req: any, res: any) => {
    try {
      const cloud = getCloudinary();
      if (!cloud) {
        return res.status(500).json({ error: "Cloudinary not configured" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No video provided" });
      }

      const result = await cloud.uploader.upload(req.file.path, {
        resource_type: 'video',
        folder: 'screen-recordings'
      });

      // Cleanup local file
      fs.unlinkSync(req.file.path);

      res.json({ url: result.secure_url });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to upload to Cloudinary" });
    }
  });

  // Vite integration for development
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

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
