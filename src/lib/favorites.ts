const FAV_KEY = 'st_favorites';

export function getFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function toggleFavorite(id: number): void {
  const favs = getFavorites();
  const key = String(id);
  if (favs.has(key)) {
    favs.delete(key);
  } else {
    favs.add(key);
  }
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify([...favs]));
  } catch {}
}
