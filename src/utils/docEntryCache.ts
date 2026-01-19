import type { DocEntry } from "@/types";

const CACHE_PREFIX = "doc_entry_cache_v1:";
const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 200;
const INDEX_KEY = `${CACHE_PREFIX}index`;

interface CachedEntry {
  entry: DocEntry;
  expiresAt: number;
}

const canUseStorage = () => typeof window !== "undefined" && !!window.localStorage;

const cacheKey = (docId: number, path: string) => `${CACHE_PREFIX}${docId}:${path}`;

interface CacheIndexEntry {
  key: string;
  expiresAt: number;
  lastAccess: number;
}

const loadIndex = (): CacheIndexEntry[] => {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CacheIndexEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Failed to read doc entry cache index:", error);
    return [];
  }
};

const saveIndex = (entries: CacheIndexEntry[]) => {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(INDEX_KEY, JSON.stringify(entries));
  } catch (error) {
    console.warn("Failed to write doc entry cache index:", error);
  }
};

const pruneExpired = () => {
  if (!canUseStorage()) return;

  try {
    let index = loadIndex();
    const now = Date.now();
    const validIndex: CacheIndexEntry[] = [];

    for (const entry of index) {
      if (entry.expiresAt <= now) {
        window.localStorage.removeItem(entry.key);
      } else {
        validIndex.push(entry);
      }
    }

    index = validIndex;

    if (index.length > MAX_ENTRIES) {
      index.sort((a, b) => a.lastAccess - b.lastAccess);
      const overflow = index.length - MAX_ENTRIES;
      for (let i = 0; i < overflow; i += 1) {
        const entry = index[i];
        if (entry) {
          window.localStorage.removeItem(entry.key);
        }
      }
      index = index.slice(overflow);
    }

    saveIndex(index);
  } catch (error) {
    console.warn("Failed to prune doc entry cache:", error);
  }
};

export const getCachedDocEntry = (docId: number, path: string): DocEntry | null => {
  if (!canUseStorage()) return null;

  try {
    const key = cacheKey(docId, path);
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;

    const cached = JSON.parse(raw) as CachedEntry;
    if (cached.expiresAt <= Date.now()) {
      window.localStorage.removeItem(key);
      return null;
    }

    const index = loadIndex();
    const nextIndex = index.map((entry) =>
      entry.key === key ? { ...entry, lastAccess: Date.now() } : entry,
    );
    saveIndex(nextIndex);

    return cached.entry;
  } catch (error) {
    console.warn("Failed to read cached doc entry:", error);
    return null;
  }
};

export const setCachedDocEntry = (entry: DocEntry) => {
  if (!canUseStorage()) return;

  const cached: CachedEntry = {
    entry,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };

  try {
    const key = cacheKey(entry.docId, entry.path);
    pruneExpired();
    window.localStorage.setItem(key, JSON.stringify(cached));

    const index = loadIndex();
    const now = Date.now();
    const nextIndex = index.filter((entry) => entry.key !== key);
    nextIndex.push({ key, expiresAt: cached.expiresAt, lastAccess: now });
    saveIndex(nextIndex);

    pruneExpired();
  } catch (error) {
    console.warn("Failed to cache doc entry:", error);
  }
};
