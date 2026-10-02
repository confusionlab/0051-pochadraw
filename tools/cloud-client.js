import { ConvexClient } from 'convex/browser';
import { api } from '../convex/_generated/api.js';

const CC = window.CC || (window.CC = {});
const url = window.POCHADRAW_CONVEX_URL;
const cacheKeys = { draft: 'pochadraw-draft', progress: 'pd-game-progress' };
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const put = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* cloud remains available if cache is full */ } };
const emit = (key, value, previous) => window.dispatchEvent(new CustomEvent('pochadraw:cloud', { detail: { key, value, previous } }));
const status = (message) => {
  Cloud.status = message;
  document.querySelectorAll('[data-cloud-status]').forEach(el => el.textContent = message);
};
const preview = new URLSearchParams(location.search).has('preview');
const Cloud = CC.Cloud = { enabled: !!url && !preview, ready: Promise.resolve(), status: url && !preview ? 'Connecting…' : 'Saved in this browser', write() {}, deletePuzzle() {}, flush: async () => {} };
if (Cloud.enabled) {
  const client = new ConvexClient(url);
  Cloud.client = client;
  const pendingKey = 'pochadraw-cloud-pending';
  // Older versions queued gameplay drawings and preferences. Never upload those retries.
  const isCloudSave = key => key.startsWith('puzzle:') || key === 'state:draft' || key === 'state:progress';
  let pending = Object.fromEntries(Object.entries(read(pendingKey, {})).filter(([key]) => isCloudSave(key)));
  put(pendingKey, pending);
  let hydrated = false, flushing = false, libraryVersion = 0, retry;
  let library = read('pochadraw-library', []), revisions = new Map(), remotePuzzles = new Map();
  const persist = () => put(pendingKey, pending);
  function enqueue(key, value) {
    pending[key] = value; persist(); status('Saving to cloud…');
    clearTimeout(retry); retry = setTimeout(flush, 300);
  }
  function applyStates(rows) {
    for (const { key, json } of rows) {
      if (!Object.hasOwn(cacheKeys, key) || Object.hasOwn(pending, 'state:' + key)) continue;
      const value = JSON.parse(json);
      if (key === 'draft' && value?.id && pending['puzzle:' + value.id] === null) continue;
      const previous = read(cacheKeys[key], null);
      put(cacheKeys[key], value);
      emit(key, value, previous);
    }
  }
  async function applyLibrary(rows) {
    const version = ++libraryVersion;
    const entries = await Promise.all(rows.map(async row => {
      if (revisions.get(row.key) === row.updatedAt && remotePuzzles.has(row.key)) return [row.key, remotePuzzles.get(row.key)];
      const json = await client.query(api.workspace.getPuzzle, { key: row.key });
      return [row.key, json ? JSON.parse(json) : null];
    }));
    if (version !== libraryVersion) return;
    remotePuzzles = new Map(entries.filter(([, value]) => value));
    revisions = new Map(rows.map(row => [row.key, row.updatedAt]));
    const merged = new Map(remotePuzzles);
    for (const [key, value] of Object.entries(pending)) if (key.startsWith('puzzle:')) {
      if (value === null) merged.delete(key.slice(7)); else merged.set(key.slice(7), JSON.parse(value));
    }
    library = [...merged.values()]; put('pochadraw-library', library); emit('library', library);
  }
  Cloud.write = (key, value) => {
    if (key === 'pochadraw-library') {
      const previous = new Map(library.map(level => [level.id, JSON.stringify(level)]));
      const next = new Map(value.map(level => [level.id, JSON.stringify(level)]));
      for (const [id, json] of next) if (previous.get(id) !== json) enqueue('puzzle:' + id, json);
      for (const id of previous.keys()) if (!next.has(id)) enqueue('puzzle:' + id, null);
      library = value;
    } else {
      const state = Object.keys(cacheKeys).find(name => cacheKeys[name] === key);
      if (state) enqueue('state:' + state, JSON.stringify(value));
    }
  };
  Cloud.deletePuzzle = id => {
    // A draft-only level also needs a delete queued, and a pending draft must
    // not upload again after the matching project is removed.
    if (pending['state:draft'] && JSON.parse(pending['state:draft'])?.id === id) delete pending['state:draft'];
    library = library.filter(level => level.id !== id);
    put('pochadraw-library', library);
    if (read(cacheKeys.draft, null)?.id === id) put(cacheKeys.draft, null);
    enqueue('puzzle:' + id, null);
  };
  async function flush() {
    retry = null;
    if (!hydrated || flushing || !navigator.onLine) { if (!navigator.onLine) status('Offline · saved here'); return; }
    flushing = true;
    try {
      for (const key of Object.keys(pending)) {
        if (!Object.hasOwn(pending, key)) continue;
        const value = pending[key];
        if (key.startsWith('puzzle:')) await client.mutation(api.workspace.savePuzzle, { key: key.slice(7), json: value });
        else await client.mutation(api.workspace.saveState, { key: key.slice(6), json: value });
        if (pending[key] === value) { delete pending[key]; persist(); }
      }
      applyStates(await client.query(api.workspace.snapshot, {}));
      await applyLibrary(await client.query(api.workspace.listPuzzles, {}));
      status(Object.keys(pending).length ? 'Saving to cloud…' : 'Saved to cloud');
    } catch (error) {
      status('Saved here · cloud retry pending');
      console.warn('Cloud save pending:', error.message);
      clearTimeout(retry); retry = setTimeout(flush, 10000);
    } finally {
      flushing = false;
      if (Object.keys(pending).length && !retry) retry = setTimeout(flush, 300);
    }
  }
  Cloud.flush = flush;
  const initialize = async () => {
    const localLibrary = library.slice();
    const localStates = Object.fromEntries(Object.entries(cacheKeys).map(([key, storage]) => [key, read(storage, null)]));
    const [states, rows] = await Promise.all([client.query(api.workspace.snapshot, {}), client.query(api.workspace.listPuzzles, {})]);
    const migratedKey = 'pochadraw-cloud-migrated:' + url;
    if (!read(migratedKey, false)) {
      const remote = new Map(states.map(row => [row.key, JSON.parse(row.json)]));
      for (const [key, value] of Object.entries(localStates)) if (value && !Object.hasOwn(pending, 'state:' + key)) {
        if (key === 'draft' && pending['puzzle:' + value.id] === null) continue;
        if (!remote.has(key)) enqueue('state:' + key, JSON.stringify(value));
        else if (key === 'progress') {
          const merged = { ...remote.get(key) };
          for (const [id, stars] of Object.entries(value)) merged[id] = Math.max(merged[id] || 0, stars);
          enqueue('state:progress', JSON.stringify(merged)); put(cacheKeys.progress, merged);
        }
      }
      for (const level of localLibrary) if (!rows.some(row => row.key === level.id) && !Object.hasOwn(pending, 'puzzle:' + level.id)) enqueue('puzzle:' + level.id, JSON.stringify(level));
      put(migratedKey, true);
    }
    applyStates(states); await applyLibrary(rows); hydrated = true;
    client.onUpdate(api.workspace.snapshot, {}, applyStates, () => status('Cloud unavailable · saved here'));
    client.onUpdate(api.workspace.listPuzzles, {}, rows => applyLibrary(rows).catch(() => status('Cloud unavailable · saved here')));
    await flush();
  };
  // Keep the game usable offline; finish hydration when the connection returns.
  Cloud.ready = Promise.race([initialize().catch(error => { status('Cloud unavailable · saved here'); console.warn(error.message); }), new Promise(resolve => setTimeout(resolve, 4500))]);
  window.addEventListener('online', () => { retry = null; flush(); });
  window.addEventListener('offline', () => status('Offline · saved here'));
}
document.addEventListener('DOMContentLoaded', () => status(Cloud.status));
