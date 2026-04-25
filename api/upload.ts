import { createReadStream } from 'node:fs';
import { unlink } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { v2 as cloudinary } from 'cloudinary';
import { IncomingForm } from 'formidable';

export const config = {
  api: {
    bodyParser: false,
    maxDuration: 60,
  },
};

function setCorsHeaders(res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res: ServerResponse, statusCode: number, payload: Record<string, unknown>) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function configureCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary environment variables missing. Uploads will fail.');
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
}

function parseForm(req: IncomingMessage) {
  const form = new IncomingForm({
    multiples: false,
    keepExtensions: true,
    maxFileSize: 200 * 1024 * 1024,
  });

  return new Promise<string>((resolve, reject) => {
    form.parse(req, (error, _fields, files) => {
      if (error) {
        reject(error);
        return;
      }

      const uploadedFile = Array.isArray(files.video) ? files.video[0] : files.video;
      const filePath = uploadedFile?.filepath;

      if (!filePath) {
        reject(new Error('No video provided'));
        return;
      }

      resolve(filePath);
    });
  });
}

function uploadToCloudinary(filePath: string) {
  return new Promise<{ secure_url: string }>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video',
        folder: 'screen-recordings',
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error('Failed to upload to Cloudinary'));
          return;
        }

        resolve({ secure_url: result.secure_url });
      },
    );

    createReadStream(filePath).pipe(uploadStream);
  });
}

export default async function handler(req: IncomingMessage & { method?: string }, res: ServerResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    configureCloudinary();

    const filePath = await parseForm(req);
    const result = await uploadToCloudinary(filePath);

    await unlink(filePath).catch(() => undefined);

    sendJson(res, 200, { url: result.secure_url });
  } catch (error) {
    console.error('Upload error:', error);
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'Failed to upload to Cloudinary',
    });
  }
}