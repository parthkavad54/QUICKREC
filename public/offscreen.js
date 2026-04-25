const DEFAULT_API_URL = 'https://quickrec-nu.vercel.app';

let mediaRecorder = null;
let activeStream = null;
let chunks = [];

function updateState(patch) {
  chrome.storage.local.set(patch);
}

async function getApiUrl() {
  const { apiUrl } = await chrome.storage.local.get(['apiUrl']);
  return typeof apiUrl === 'string' && apiUrl.trim() ? apiUrl.replace(/\/$/, '') : DEFAULT_API_URL;
}

async function uploadVideo(blob) {
  const apiUrl = await getApiUrl();
  const formData = new FormData();
  formData.append('video', blob, 'recording.webm');

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${apiUrl}/api/upload`, true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        updateState({ uploadProgress: percent });
      }
    };

    xhr.onload = () => {
      try {
        const response = JSON.parse(xhr.responseText);

        if (xhr.status === 200 && response.url) {
          resolve(response.url);
          return;
        }

        reject(new Error(response.error || 'Upload failed'));
      } catch (error) {
        reject(error);
      }
    };

    xhr.onerror = () => {
      reject(new Error(`Network error. Check if the API is reachable at ${apiUrl}/api/upload`));
    };

    xhr.send(formData);
  });
}

async function startRecording() {
  try {
    updateState({ recording: false, uploading: false, uploadProgress: 0, videoUrl: null, error: null });

    activeStream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: { ideal: 30 } },
      audio: true,
    });

    chunks = [];
    mediaRecorder = new MediaRecorder(activeStream, { mimeType: 'video/webm;codecs=vp9' });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      try {
        updateState({ recording: false, uploading: true, uploadProgress: 0, error: null });

        const videoBlob = new Blob(chunks, { type: 'video/webm' });
        const videoUrl = await uploadVideo(videoBlob);

        updateState({
          recording: false,
          uploading: false,
          uploadProgress: 100,
          videoUrl,
          error: null,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Upload failed';
        updateState({
          recording: false,
          uploading: false,
          uploadProgress: 0,
          error: message,
        });
      } finally {
        if (activeStream) {
          activeStream.getTracks().forEach((track) => track.stop());
          activeStream = null;
        }

        mediaRecorder = null;
        chunks = [];
        chrome.runtime.sendMessage({ type: 'REQUEST_CLOSE_OFFSCREEN' });
      }
    };

    mediaRecorder.start();
    updateState({ recording: true, uploading: false, uploadProgress: 0, videoUrl: null, error: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not start recording';
    updateState({ recording: false, uploading: false, uploadProgress: 0, error: message });

    if (activeStream) {
      activeStream.getTracks().forEach((track) => track.stop());
      activeStream = null;
    }

    chrome.runtime.sendMessage({ type: 'REQUEST_CLOSE_OFFSCREEN' });
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'OFFSCREEN_START_RECORDING') {
    startRecording();
  }

  if (message?.type === 'OFFSCREEN_STOP_RECORDING') {
    stopRecording();
  }
});