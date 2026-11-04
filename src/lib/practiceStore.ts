// Best practice scores, kept on the device.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TrackId } from '../data/practice';

const KEY = 'poe.practice.v1';
export type Bests = Partial<Record<TrackId, number>>;

export async function loadBests(): Promise<Bests> {
  try {
    return JSON.parse((await AsyncStorage.getItem(KEY)) ?? '{}') as Bests;
  } catch {
    return {};
  }
}

export async function saveBest(track: TrackId, percent: number) {
  const b = await loadBests();
  if ((b[track] ?? -1) < percent) {
    b[track] = percent;
    await AsyncStorage.setItem(KEY, JSON.stringify(b)).catch(() => {});
  }
}
