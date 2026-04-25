# QuickRec 🎥

Simple screen recording extension that uploads to Cloudinary and generates a shareable link.

## 🛠 How It Works
1. **Start Recording**: Uses `navigator.mediaDevices.getDisplayMedia` to capture the screen.
2. **Stop & Upload**: When recording stops, the WebM blob is sent to the Node.js backend.
3. **Cloudinary**: The backend uploads the video to Cloudinary using their SDK.
4. **Link Sharing**: Once uploaded, a shareable Cloudinary URL is provided to the user.

## 📂 Project Structure
- `server.ts`: Node.js server with Express and Cloudinary integration.
- `src/App.tsx`: Minimalist UI with recording and link generation logic.
- `public/manifest.json`: Extension configuration.

## 🚀 Setup
1. **Cloudinary Credentials**: Add your Cloudinary API keys to `.env`.
2. **Run Server**: `npm run dev`
