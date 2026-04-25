import React, { useEffect, useMemo, useState } from 'react';
import { Play, Square, Copy, Check, AlertCircle, Clock3, UploadCloud, CircleCheckBig } from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || 'https://quickrec-nu.vercel.app').replace(/\/$/, '');

type RecorderState = {
  recording: boolean;
  uploading: boolean;
  uploadProgress: number;
  videoUrl: string | null;
  copied: boolean;
  error: string | null;
};

const defaultState: RecorderState = {
  recording: false,
  uploading: false,
  uploadProgress: 0,
  videoUrl: null,
  copied: false,
  error: null,
};

function sendMessage<T>(message: Record<string, unknown>) {
  return new Promise<T>((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(response as T);
    });
  });
}

export default function App() {
  const [state, setState] = useState<RecorderState>(defaultState);
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    chrome.storage.local.set({ apiUrl: API_URL });

    chrome.storage.local.get(
      ['recording', 'uploading', 'uploadProgress', 'videoUrl', 'error'],
      (items) => {
        setState((current) => ({
          ...current,
          recording: Boolean(items.recording),
          uploading: Boolean(items.uploading),
          uploadProgress: typeof items.uploadProgress === 'number' ? items.uploadProgress : 0,
          videoUrl: typeof items.videoUrl === 'string' ? items.videoUrl : null,
          error: typeof items.error === 'string' ? items.error : null,
        }));
      },
    );

    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName !== 'local') {
        return;
      }

      setState((current) => ({
        ...current,
        recording: changes.recording ? Boolean(changes.recording.newValue) : current.recording,
        uploading: changes.uploading ? Boolean(changes.uploading.newValue) : current.uploading,
        uploadProgress:
          changes.uploadProgress && typeof changes.uploadProgress.newValue === 'number'
            ? changes.uploadProgress.newValue
            : current.uploadProgress,
        videoUrl:
          changes.videoUrl && typeof changes.videoUrl.newValue === 'string'
            ? changes.videoUrl.newValue
            : changes.videoUrl && changes.videoUrl.newValue === null
              ? null
              : current.videoUrl,
        error:
          changes.error && typeof changes.error.newValue === 'string'
            ? changes.error.newValue
            : changes.error && changes.error.newValue === null
              ? null
              : current.error,
      }));
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  useEffect(() => {
    const start = window.setInterval(() => {
      setDisplayProgress((current) => {
        const target = state.uploadProgress;

        if (!state.uploading && target === 0) {
          return 0;
        }

        if (current === target) {
          return current;
        }

        const delta = target - current;
        const step = Math.max(1, Math.ceil(Math.abs(delta) * 0.12));

        if (Math.abs(delta) <= 1) {
          return target;
        }

        return current + Math.sign(delta) * step;
      });
    }, 60);

    return () => window.clearInterval(start);
  }, [state.uploadProgress, state.uploading]);

  const startRecording = async () => {
    try {
      await sendMessage<{ ok: boolean }>({ type: 'START_RECORDING' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not start recording';
      setState((current) => ({ ...current, error: message }));
      await chrome.storage.local.set({ error: message });
    }
  };

  const stopRecording = async () => {
    try {
      await sendMessage<{ ok: boolean }>({ type: 'STOP_RECORDING' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not stop recording';
      setState((current) => ({ ...current, error: message }));
      await chrome.storage.local.set({ error: message });
    }
  };

  const copyLink = async () => {
    if (!state.videoUrl) {
      return;
    }

    await navigator.clipboard.writeText(state.videoUrl);
    setState((current) => ({ ...current, copied: true }));
    setTimeout(() => {
      setState((current) => ({ ...current, copied: false }));
    }, 2000);
  };

  const statusLabel = useMemo(() => {
    if (state.recording) return 'Recording';
    if (state.uploading) return 'Uploading';
    if (state.videoUrl) return 'Ready';
    return 'Idle';
  }, [state.recording, state.uploading, state.videoUrl]);

  const statusDescription = useMemo(() => {
    if (state.recording) return 'Your screen is being captured in the background.';
    if (state.uploading) return 'Uploading to Cloudinary. This stays visible even if the popup closes.';
    if (state.videoUrl) return 'Upload completed. Copy the link or record again.';
    return 'Simple recorder with native light and dark appearance.';
  }, [state.recording, state.uploading, state.videoUrl]);

  return (
    <div className="qr-shell">
      <div className="qr-card">
        <div className="qr-header">
          <div>
            <p className="qr-kicker">QuickRec</p>
            <h1 className="qr-title">Screen Recorder</h1>
          </div>
          <span className="qr-badge">{statusLabel}</span>
        </div>

        <p className="qr-subtitle">{statusDescription}</p>

        {state.error && (
          <div className="qr-alert">
            <AlertCircle className="qr-icon" />
            <span>{state.error}</span>
          </div>
        )}

        <div className="qr-stack">
          {!state.recording && !state.uploading && !state.videoUrl && (
            <button onClick={startRecording} className="qr-button qr-button-primary">
              <Play className="qr-button-icon" />
              Start recording
            </button>
          )}

          {state.recording && (
            <button onClick={stopRecording} className="qr-button qr-button-danger">
              <Square className="qr-button-icon" />
              Stop recording
            </button>
          )}

          {state.uploading && (
            <div className="qr-panel">
              <div className="qr-progress-row">
                <span className="qr-progress-label">
                  <UploadCloud className="qr-inline-icon" />
                  Uploading to Cloudinary
                </span>
                <span className="qr-progress-value">{displayProgress}%</span>
              </div>
              <div className="qr-progress-track" aria-hidden="true">
                <div className="qr-progress-fill" style={{ width: `${displayProgress}%` }} />
              </div>
              <div className="qr-progress-meta">
                <span><Clock3 className="qr-inline-icon" /> Live progress</span>
                <span>Keep this popup open or close it safely</span>
              </div>
            </div>
          )}

          {state.videoUrl && (
            <div className="qr-panel">
              <div className="qr-progress-row">
                <span className="qr-progress-label">
                  <CircleCheckBig className="qr-inline-icon" />
                  Upload finished
                </span>
                <span className="qr-progress-value">100%</span>
              </div>

              <div className="qr-link-box">
                <span className="qr-link-label">Share link</span>
                <p className="qr-link-text">{state.videoUrl}</p>
              </div>

              <div className="qr-actions">
                <button onClick={copyLink} className="qr-button qr-button-secondary">
                  {state.copied ? <Check className="qr-button-icon" /> : <Copy className="qr-button-icon" />}
                  {state.copied ? 'Copied' : 'Copy link'}
                </button>
                <button onClick={startRecording} className="qr-button qr-button-ghost">
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
