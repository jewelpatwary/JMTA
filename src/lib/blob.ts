const BLOB_URL_KEY = 'rf_blob_url';
const DATA_KEY = 'rf_all_data';

// In-memory cache so reads are instant
let memoryCache: Record<string, any> = {};
let isSyncing = false;
let syncQueue: (() => void)[] = [];

// Load all data from Vercel Blob into memory
export const initBlob = async (): Promise<void> => {
  try {
    // First load from localStorage as instant fallback
    const local = localStorage.getItem(DATA_KEY);
    if (local) {
      memoryCache = JSON.parse(local);
    }

    // Then fetch latest from Blob in background
    const blobUrl = localStorage.getItem(BLOB_URL_KEY);
    if (blobUrl) {
      const res = await fetch(blobUrl + '?t=' + Date.now()); // cache bust
      if (res.ok) {
        const data = await res.json();
        memoryCache = data;
        localStorage.setItem(DATA_KEY, JSON.stringify(data));
      }
    }
  } catch (e) {
    console.warn('Blob init failed, using localStorage fallback:', e);
  }
};

// Read from memory (instant, no async needed)
export const blobLoad = (key: string): any => {
  const val = memoryCache[key];
  if (val !== undefined) return val;
  // fallback to localStorage
  return JSON.parse(localStorage.getItem(key) || '[]');
};

// Write to memory + localStorage immediately, then sync to Blob
export const blobSave = (key: string, data: any): void => {
  // Update memory instantly
  memoryCache[key] = data;
  // Update localStorage instantly (for same-device speed)
  localStorage.setItem(key, JSON.stringify(data));
  localStorage.setItem(DATA_KEY, JSON.stringify(memoryCache));
  // Sync to Blob (debounced)
  scheduleBlobSync();
};

// Debounced sync — waits 500ms after last save before uploading
let syncTimer: ReturnType<typeof setTimeout> | null = null;
const scheduleBlobSync = () => {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncToBlob();
  }, 500);
};

const syncToBlob = async () => {
  if (isSyncing) {
    syncQueue.push(syncToBlob);
    return;
  }
  isSyncing = true;
  try {
    const response = await fetch('/api/save-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memoryCache),
    });

    if (response.ok) {
      const { url } = await response.json();
      if (url) localStorage.setItem(BLOB_URL_KEY, url);
    }
  } catch (e) {
    console.warn('Blob sync failed:', e);
  } finally {
    isSyncing = false;
    if (syncQueue.length > 0) {
      const next = syncQueue.shift();
      if (next) next();
    }
  }
};