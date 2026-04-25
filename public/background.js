const OFFSCREEN_URL = 'offscreen.html';

async function hasOffscreenDocument() {
  if (!chrome.runtime.getContexts) {
    return false;
  }

  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
  });

  return contexts.some((context) => context.documentUrl.endsWith(OFFSCREEN_URL));
}

async function ensureOffscreenDocument() {
  try {
    if (await hasOffscreenDocument()) {
      return;
    }

    await chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: ['DISPLAY_MEDIA'],
      justification: 'Keep screen recording alive when the popup closes.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';

    if (!message.includes('only a single offscreen document may exist')) {
      throw error;
    }
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    recording: false,
    uploading: false,
    uploadProgress: 0,
    videoUrl: null,
    error: null,
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'START_RECORDING') {
    (async () => {
      await ensureOffscreenDocument();
      await chrome.runtime.sendMessage({ type: 'OFFSCREEN_START_RECORDING' });
      sendResponse({ ok: true });
    })().catch((error) => {
      chrome.storage.local.set({ error: error instanceof Error ? error.message : 'Could not start recording' });
      sendResponse({ ok: false });
    });

    return true;
  }

  if (message?.type === 'STOP_RECORDING') {
    chrome.runtime.sendMessage({ type: 'OFFSCREEN_STOP_RECORDING' });
    sendResponse({ ok: true });
    return false;
  }

  if (message?.type === 'REQUEST_CLOSE_OFFSCREEN') {
    chrome.offscreen.closeDocument().catch(() => undefined);
    sendResponse({ ok: true });
    return false;
  }

  return false;
});