// storage-client.js - full backup captured 2025-10-10 15:00
export async function saveData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch(e) { console.warn('saveData failed', e); }
}
export function loadData(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); }
  catch(e) { return null; }
}
