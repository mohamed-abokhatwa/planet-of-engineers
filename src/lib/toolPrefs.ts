// Per-device tool preferences: favourites and the last inputs of each tool. Stored locally, never uploaded.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

const FAV_KEY = 'poe.fav.v1';
const inputsKey = (id: string) => `poe.tool.${id}.v1`;

let favs: string[] = [];
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function load() {
  if (loaded) return;
  loaded = true;
  AsyncStorage.getItem(FAV_KEY)
    .then((raw) => {
      if (raw) {
        favs = JSON.parse(raw);
        emit();
      }
    })
    .catch(() => {});
}

const subscribe = (l: () => void) => {
  load();
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useFavourites() {
  return useSyncExternalStore(subscribe, () => favs, () => favs);
}

export function toggleFavourite(id: string) {
  favs = favs.includes(id) ? favs.filter((x) => x !== id) : [...favs, id];
  emit();
  AsyncStorage.setItem(FAV_KEY, JSON.stringify(favs)).catch(() => {});
}

type Vals = Record<string, number | string>;
// NaN does not survive JSON, so blank fields are stored as null.
export async function loadInputs(id: string): Promise<Vals | null> {
  try {
    const raw = await AsyncStorage.getItem(inputsKey(id));
    if (!raw) return null;
    const o = JSON.parse(raw) as Record<string, number | string | null>;
    return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === null ? NaN : v]));
  } catch {
    return null;
  }
}
export function saveInputs(id: string, v: Vals) {
  const o = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, typeof x === 'number' && !Number.isFinite(x) ? null : x]));
  AsyncStorage.setItem(inputsKey(id), JSON.stringify(o)).catch(() => {});
}
export function clearInputs(id: string) {
  AsyncStorage.removeItem(inputsKey(id)).catch(() => {});
}
