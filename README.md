# QuickRec

QuickRec is a Chrome extension that records your screen, uploads the video to Cloudinary, and gives you a shareable link.

## Features

- Start and stop screen recording from the extension popup
- Keep recording active even if the popup closes
- Upload video to Cloudinary through the backend API
- Copy the final share link in one click
- Simple light and dark UI that follows your browser theme

## How It Works

1. The extension opens a screen capture session using the browser picker.
2. The recording runs in the background/offscreen page so closing the popup does not stop it.
3. When you stop recording, the video is uploaded to Cloudinary through the API.
4. After upload, QuickRec shows the final Cloudinary link and lets you copy it.

## Clone the Repository

```bash
git clone https://github.com/your-username/quickRec.git
cd quickRec
```

## Install Dependencies

```bash
npm install
```

## Add Environment Variables

Create a file named `.env` in the project root and add your values:

```env
VITE_API_URL=https://quickrec-nu.vercel.app

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

The `VITE_API_URL` value is used by the extension popup. The Cloudinary values are used by the upload API.

## Build the Extension

```bash
npm run build
```

This creates the production files inside `dist/`.

## Run the Backend Locally

```bash
npm run dev
```

The server runs on `http://localhost:3000` in local development.

## Load the Extension in Chrome

1. Open `chrome://extensions`
2. Turn on **Developer mode**
3. Click **Load unpacked**
4. Select the `dist/` folder from this project
5. Open the QuickRec popup from the browser toolbar

## How to Use

1. Click **Start recording**.
2. Choose the screen, window, or tab you want to capture.
3. Record your content.
4. Click **Stop recording** when you are done.
5. Wait for the upload to finish.
6. Copy the generated Cloudinary link.

## Notes

- The popup follows your browser theme using light mode and dark mode.
- If you close the popup while recording, the recording keeps running.
- If upload errors appear, check your `.env` values and backend API URL.
- Do not commit `.env` to GitHub because it contains secrets.

## Project Structure

- `src/App.tsx`: Popup UI and extension messaging
- `src/index.css`: Theme and popup styling
- `public/background.js`: Background service worker
- `public/offscreen.js`: Recording and upload logic
- `public/manifest.json`: Extension manifest
- `server.ts`: Local Express backend for development
