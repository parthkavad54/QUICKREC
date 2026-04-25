import React, { useState, useRef } from 'react';
import { Play, Square, Copy, Check } from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

export default function App() {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30 } },
        audio: true
      });

      chunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const videoBlob = new Blob(chunksRef.current, { type: 'video/webm' });
        uploadVideo(videoBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setRecording(true);
      setVideoUrl(null);
      setUploadProgress(0);
    } catch (err: any) {
      setError(err.message || "Could not start recording");
      console.error("Recording error:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const uploadVideo = (blob: Blob) => {
    setUploading(true);
    setUploadProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append('video', blob, 'recording.webm');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/api/upload`, true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
      }
    };

    xhr.onload = () => {
      try {
        const response = JSON.parse(xhr.responseText);
        if (xhr.status === 200 && response.url) {
          setVideoUrl(response.url);
        } else {
          throw new Error(response.error || 'Upload failed');
        }
      } catch (err: any) {
        setError(err.message || "Upload failed");
        console.error("Upload error:", err);
      } finally {
        setUploading(false);
      }
    };

    xhr.onerror = () => {
      setError(`Network error. Check if the API is reachable at ${API_URL}/api/upload`);
      setUploading(false);
      console.error("XHR Error");
    };

    xhr.send(formData);
  };

  const copyLink = () => {
    if (videoUrl) {
      navigator.clipboard.writeText(videoUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="w-[340px] max-w-full bg-slate-950 text-white p-3">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 shadow-xl shadow-black/20">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold leading-tight">QuickRec</h1>
            <p className="mt-1 text-xs text-slate-300">Record, upload, and share from a small popup.</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-300">
            {recording ? 'Recording' : uploading ? 'Uploading' : videoUrl ? 'Ready' : 'Idle'}
          </span>
        </div>

        {error && (
          <div className="mb-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
            {error}
          </div>
        )}

        <div className="space-y-2">
          {!recording && !uploading && !videoUrl && (
            <button
              onClick={startRecording}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-sky-400"
            >
              <Play className="h-4 w-4" />
              Start recording
            </button>
          )}

          {recording && (
            <button
              onClick={stopRecording}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-400"
            >
              <Square className="h-4 w-4" />
              Stop recording
            </button>
          )}

          {uploading && (
            <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-sky-400 transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-center text-xs text-slate-300">Uploading {uploadProgress}%</p>
            </div>
          )}

          {videoUrl && (
            <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Share link</p>
              <p className="max-h-20 break-all text-xs text-sky-300">{videoUrl}</p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={copyLink}
                  className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-400"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  onClick={() => setVideoUrl(null)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  Record again
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
